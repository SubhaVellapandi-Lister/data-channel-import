import {
    BaseProcessor,
    fileHeaders,
    IFileProcessorInput,
    IFileProcessorOutput,
    IOutputFileStreamDetails,
    IStepAfterInput,
    IStepAfterOutput,
    IStepBeforeInput,
    s3CsvWriteable,
    s3Readable
} from "@data-channels/dcSDK";
import AWS from "aws-sdk";
import parse from "csv-parse";
import { Readable } from "stream";
import { sleep } from "../utils";

export interface IAthenaConfig {
    outputs: {
        [outputName: string]: {
            query: string;
        };
    };
    inputs?: {
        [inputName: string]: {
            columnTypes?: {
                [columnName: string]: string
            };
        };
    };
}

export default class Athena extends BaseProcessor {
    private config: IAthenaConfig = { outputs: {}};
    private dbName: string = '';
    private queryStatistics: { [ouptutName: string]: object} = {};
    private queryError = '';

    public async sql(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        return this.athena(input);
    }

    public async before_sql(input: IStepBeforeInput) {
        return this.before_athena(input);
    }

    public async after_sql(input: IStepAfterInput) {
        return this.after_athena(input);
    }

    public async athena(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        await this.createTables(input);
        await this.runQueries(input);

        return {};
    }

    public async before_athena(input: IStepBeforeInput) {
        this.config = (input.parameters!['athenaConfig'] || input.parameters!['sqlConfig'] || {}) as IAthenaConfig;
        this.dbName = 'dchan' + this.job.guid.replace(/-/g, '');

        console.log('Creating database', this.dbName);

        await this.executeSyncQuery({
            QueryString: `create database ${this.dbName}`
        });

        console.log('Created database', this.dbName);
    }

    public async after_athena(input: IStepAfterInput): Promise<IStepAfterOutput> {
        await this.executeSyncQuery({
            QueryString: `drop database ${this.dbName} cascade`
        });

        if (this.queryError) {
            await this.job.terminalError('Athena-Query', this.queryError);
        }

        return {
            results: {
                queryStatistics: this.queryStatistics
            }
        };
    }

    private async createTables(input: IFileProcessorInput) {
        for (const inputName of Object.keys(input.inputs)) {
            console.log(`creating table for ${inputName}`);
            let inputStreams = input.inputs[inputName];

            const headers = await fileHeaders(inputStreams[0].readable);

            if (!headers.length) {
                console.log(`Empty file found for ${inputName}`);
                continue;
            }

            console.log(`found headers ${headers}`);
            inputStreams = await this.refreshInputStream(inputName);
            const tempFolder = `workspace/athena/${this.dbName}/${inputName}/`;

            for (const [idx, stream] of inputStreams.entries()) {

                const tempKey = `${tempFolder}data.${idx}.csv`;

                const tempOutDetails = await this.getWritableDetails(this.job.workspace!.bucket!, tempKey);
                const parser = parse({ bom: true, skip_empty_lines: true, skip_lines_with_empty_values: true});
                const finalStream = stream.readable.pipe(parser).pipe(tempOutDetails.writeStream);

                console.log(`writing temp work file ${tempKey}`);
                await new Promise((resolve, reject) => {
                    finalStream.on("finish", resolve);
                    finalStream.on("end", resolve);
                });

                console.log('writing temp work file streaming finished');

                await tempOutDetails.uploadResponsePromise;

                console.log(`wrote temp work file`);
            }

            const config = this.config;
            function colType(name: string): string {
                if (config.inputs && config.inputs[inputName] && config.inputs[inputName].columnTypes?.[name]) {
                    return ' ' + config.inputs[inputName].columnTypes?.[name];
                }

                return ' STRING';
            }

            const createQuery = `
            CREATE EXTERNAL TABLE IF NOT EXISTS ${inputName} (
                ${headers.map((h) => h + colType(h)).join(', ')}
            )
            ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
            WITH SERDEPROPERTIES (
                'separatorChar' = ',', 'quoteChar' = '\\"', 'escapeChar' = '\\\\' )
            STORED AS TEXTFILE
            LOCATION 's3://${this.job.workspace!.bucket}/${tempFolder}'
            TBLPROPERTIES ( "skip.header.line.count"="1" )
            `;

            console.log(createQuery);

            const createTableResult = await this.executeSyncQuery({
                QueryString: createQuery,
                QueryExecutionContext: {
                    Database: this.dbName
                }
            });

            console.log(createTableResult);
        }
    }

    private async runQueries(input: IFileProcessorInput) {
        for (const outName of Object.keys(this.config.outputs)) {
            const result = await this.executeSyncQuery({
                QueryString: this.config.outputs[outName].query,
                QueryExecutionContext: {
                    Database: this.dbName
                }
            });
            console.log(result);
            if (result.QueryExecution?.Status?.State === 'FAILED') {
                this.queryError = result.QueryExecution?.Status?.StateChangeReason ?? 'Unknown Error';

                return;
            }

            const resultsReadable = await this.getReadable(
                this.job.workspace!.bucket, `workspace/athena/results/${result.QueryExecution!.QueryExecutionId}.csv`);
            const writeOutput = input.outputs[outName];
            const parser = parse({ bom: true, skip_empty_lines: true, skip_lines_with_empty_values: true});
            resultsReadable.pipe(parser).pipe(writeOutput.writeStream);

            this.queryStatistics[outName] = result.QueryExecution?.Statistics ?? {};
        }
    }

    private async executeSyncQuery(
        params: AWS.Athena.StartQueryExecutionInput
    ): Promise<AWS.Athena.GetQueryExecutionOutput> {
        const athena = new AWS.Athena();

        if (!params.ResultConfiguration) {
            params.ResultConfiguration = {
                OutputLocation: `s3://${this.job.workspace!.bucket}/workspace/athena/results/`
            };
        }

        const queryResult: AWS.Athena.StartQueryExecutionOutput = await new Promise((resolve, reject) => {
            athena.startQueryExecution(params, (err, data) => {
                if (err) {
                    console.log(err, err.stack);
                    reject(err);
                } else {
                    console.log(data);
                    resolve(data);
                }
            });
        });

        while (true) {
            const statusResult: AWS.Athena.GetQueryExecutionOutput = await new Promise((resolve, reject) => {
                athena.getQueryExecution({
                    QueryExecutionId: queryResult.QueryExecutionId!
                }, (err, data) => {
                    if (err) {
                        console.log(err, err.stack);
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });

            if (statusResult.QueryExecution?.Status?.State) {
                if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(statusResult.QueryExecution.Status.State)) {
                    return statusResult;
                }
            }

            await sleep(1000);
        }
    }

    private async getWritableDetails(bucket: string, key: string): Promise<IOutputFileStreamDetails> {
        return s3CsvWriteable(bucket, key);
    }

    private async getReadable(bucket: string, key: string): Promise<Readable> {
        return s3Readable(bucket, key);
    }
}
