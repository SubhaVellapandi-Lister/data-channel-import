import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IStepAfterInput,
    IStepAfterOutput,
    IStepBeforeInput,
    s3Readable,
    s3Writeable
} from "@data-channels/dcSDK";
import AWS from "aws-sdk";
import parse from "csv-parse";
import { readFileSync } from "fs";
import { Readable } from "stream";
import { sleep } from "../utils";

export enum EtlJobType {
    TABLE = 'table',
    QUERY = 'query'
}

export interface IGlueConfig {
    outputs: {
        [outputName: string]: IOutputConfig;
    };
}

export interface IOutputConfig {
    glueSourceDatabase: {
        name: string;
    };
    etlJob: {
        roleArn: string;
        connections: string[];
        dchanEtlJobType: EtlJobType;
        dumpTableName?: string;
        sqlTableNames?: string[];
        sqlQuery?: string;
        numWorkers?: number;
        workerType?: string;
    };
}

interface IJobRun {
    jobName: string;
    outputName: string;
    runId: string;
    startDate: Date;
    endDate?: Date;
    status?: string;
}

export default class Glue extends BaseProcessor {
    private config: IGlueConfig = { outputs: {}};
    private waitingJobs: IJobRun[] = [];

    public async glue(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        const glue = new AWS.Glue();

        for (const [outputName, outputConfig] of Object.entries(this.config)) {
            const jobName = this.glueJobName(outputName);
            const runId = await this.executeJob(glue, jobName);
            this.waitingJobs.push({
                jobName,
                outputName,
                runId,
                startDate: new Date()
            });
        }

        let unfinishedJobs = true;
        while (unfinishedJobs) {
            await sleep(10000);
            unfinishedJobs = false;
            for (const job of this.waitingJobs) {
                const status = await this.jobInfo(glue, job.jobName, job.runId);
                job.status = status.JobRun!.JobRunState;
                if (["STOPPED", "SUCCEEDED", "FAILED", "TIMEOUT"].includes(job.status ?? '')) {
                    job.endDate = status.JobRun?.CompletedOn;

                    const outputKeys = await this.outputKeyList(
                        this.job.workspace!.bucket,
                        `workspace/glue/outputs/${this.job.guid}-${job.outputName}`);

                    if (!outputKeys.length) {
                        console.log(`No output files found for ${job.jobName}`);
                    } else {
                        console.log(`Found file ${outputKeys[0]} for ${job.jobName}`);
                        const resultsReadable = await this.getReadable(
                            this.job.workspace!.bucket, outputKeys[0]);
                        const writeOutput = input.outputs[job.outputName];
                        const parser = parse({ bom: true, skip_empty_lines: true, skip_lines_with_empty_values: true});
                        const finalStream = resultsReadable.pipe(parser).pipe(writeOutput.writeStream);

                        console.log(`Writing ${outputKeys[0]} to job folder`);

                        await new Promise((resolve, reject) => {
                            finalStream.on("finish", resolve);
                            finalStream.on("end", resolve);
                        });
                    }

                    console.log(`Finished with job ${job.jobName}`);

                } else {
                    unfinishedJobs = true;
                }
            }
        }

        return {};
    }

    public async before_glue(input: IStepBeforeInput) {
        this.config = (input.parameters!['glueConfig'] || {}) as IGlueConfig;
        const glue = new AWS.Glue();

        for (const [outputName, outputConfig] of Object.entries(this.config)) {
            await this.createJob(glue, outputName, outputConfig);
        }
    }

    public async after_glue(input: IStepAfterInput): Promise<IStepAfterOutput> {
        const glue = new AWS.Glue();

        for (const job of this.waitingJobs) {
            await this.deleteJob(glue, job.jobName);
        }

        return {
            results: {
                jobs: this.waitingJobs
            }
        };
    }

    private async createJob(glue: AWS.Glue, name: string, config: IOutputConfig) {
        const scriptKey = `workspace/glue/scripts/${this.job.guid}-${name}.py`;
        const scriptAsString = readFileSync('glueetl/glueSparkDefault.py').toString();

        console.log(`Creating script at ${scriptKey}`);
        await s3Writeable(this.job.workspace?.bucket!, scriptKey, Readable.from([scriptAsString]));

        const jobName = this.glueJobName(name);
        console.log(`Creating job ${jobName}`);
        const jobCreateResult: AWS.Glue.CreateJobResponse = await new Promise((resolve, reject) => {
            glue.createJob({
                Name: jobName,
                Role: config.etlJob.roleArn,
                Command: {
                    Name: 'glueetl',
                    PythonVersion: '3',
                    ScriptLocation: `s3://${this.job.workspace?.bucket!}/${scriptKey}`
                },
                Connections: {
                    Connections: config.etlJob.connections
                },
                DefaultArguments: {
                    '--aws_region': process.env.AWS_REGION ?? 'us-east-1',
                    '--s3_output_path':
                        `s3://${this.job.workspace?.bucket!}/workspace/glue/outputs/${this.job.guid}-${name}`,
                    '--glue_database': config.glueSourceDatabase.name,
                    '--glue_table_name': config.etlJob.dumpTableName ?? '',
                    '--spark_sql_table_names': (config.etlJob.sqlTableNames ?? []).join(','),
                    '--spark_sql_query': config.etlJob.sqlQuery ?? ''
                },
                WorkerType: config.etlJob.workerType ?? 'G.1X',
                GlueVersion: '2.0',
                NumberOfWorkers: config.etlJob.numWorkers ?? 1
            }, (err, data) => {
                if (err) {
                    console.log(err, err.stack);
                    reject(err);
                } else {
                    console.log(data);
                    resolve(data);
                }
            });
        });
        console.log(`Job created`);
    }

    private async executeJob(glue: AWS.Glue, name: string): Promise<string> {
        const response: AWS.Glue.StartJobRunResponse = await new Promise((resolve, reject) => {
            glue.startJobRun({
                JobName: name
            }, (err, data) => {
                if (err) {
                    console.log(err, err.stack);
                    reject(err);
                } else {
                    console.log(data);
                    resolve(data);
                }
            });
        });

        return response.JobRunId!;
    }

    private async jobInfo(glue: AWS.Glue, name: string, runId: string): Promise<AWS.Glue.GetJobRunResponse> {
        const response: AWS.Glue.GetJobRunResponse = await new Promise((resolve, reject) => {
            glue.getJobRun({
                JobName: name,
                RunId: runId
            }, (err, data) => {
                if (err) {
                    console.log(err, err.stack);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        return response;
    }

    private glueJobName(outputName: string): string {
        return `data-channels-${this.job.guid}-${outputName}`;
    }

    private async outputKeyList(bucket: string, path: string): Promise<string[]> {
        const s3 = new AWS.S3({ region: process.env.AWS_REGION ?? 'us-east-1'});

        const response: AWS.S3.ListObjectsV2Output = await new Promise((resolve, reject) => {
            s3.listObjectsV2({
                Bucket: bucket,
                Prefix: path
            }, (err, data) => {
                if (err) {
                    console.log(err, err.stack);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        return response.Contents!.map((item) => item.Key!);
    }

    private async deleteJob(glue: AWS.Glue, jobName: string) {
        await new Promise((resolve, reject) => {
            glue.deleteJob({
                JobName: jobName
            }, (err, data) => {
                if (err) {
                    console.log(err, err.stack);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    private async getReadable(bucket: string, key: string): Promise<Readable> {
        return s3Readable(bucket, key);
    }
}
