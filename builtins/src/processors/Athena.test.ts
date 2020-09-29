import internal from "stream";

import { csvReadableToStrings, IFileProcessorInput, IInput, IOutputFileStreamDetails, Job, JobStatus } from "@data-channels/dcSDK";
import AWS from "aws-sdk";
import AWSMock from "aws-sdk-mock";
import stringify from "csv-stringify";

import 'jest';

import Athena from "./Athena";

describe('Athena', () => {
    test('test athena built-in', async () => {
        const stop = { stopDate: new Date() };
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock("Athena", "startQueryExecution", { QueryExecutionId: '111' });
        AWSMock.mock("Athena", "getQueryExecution", {
            QueryExecution: {
                QueryExecutionId: '111',
                Status: {
                    State: 'SUCCEEDED'
                },
                Statistics: {
                    someStat: 999
                }
            }
        });
        const inputStringifier = stringify({ delimiter: ',' });
        const refreshStringifier = stringify({ delimiter: ',' });
        const resultsStringifier = stringify({ delimiter: ',' });

        inputStringifier.write(['header1, header2']);
        inputStringifier.write(['val1, val2']);
        inputStringifier.end();

        refreshStringifier.write(['header1, header2']);
        refreshStringifier.write(['val1, val2']);
        refreshStringifier.end();

        resultsStringifier.write(['header1, header2']);
        resultsStringifier.write(['val1, val2']);
        resultsStringifier.end();

        const job = Job.fromConfig(jobConfig);
        const processor = new Athena(job);
        const writeStream = stringify();
        const params: IFileProcessorInput = {
            parameters: {
                sqlConfig: {
                    outputs: {
                        myQuery: {
                            query: 'select * from data'
                        }
                    }
                }
            },
            inputs: {
                data: [{ readable: inputStringifier, details: {} } as any]
            },
            outputs: {
                myQuery: {
                    writeStream,
                    bucket: '',
                    key: '',
                    uploadResponsePromise: {} as any
                }
            }
        };

        processor['refreshInputStream'] = async (): Promise<IInput[]> => [{ readable: refreshStringifier, details: {} }];
        processor['getWritableDetails'] = (): Promise<IOutputFileStreamDetails> => (new Promise((resolve, reject) => resolve({
            writeStream: stringify(),
            uploadResponsePromise: new Promise((res, rej) => res()),
            bucket: 'some-bucket',
            key: 'some-key'
        })));
        processor['getReadable'] = async (): Promise<internal.Readable> => resultsStringifier;

        await processor['before_sql'](params);
        await processor['sql'](params);
        await processor['after_sql'](params);
    });

    afterEach(() => {
        AWSMock.restore();
    });
});

const jobConfig = {
    guid: 'some-guid-here',
    created: new Date(),
    name: 'some-job',
    isDeleted: false,
    currentStep: 'exportCourses',
    status: JobStatus.Started,
    statusMsg: '',
    channel: {
        guid: 'some-channel-guid-here',
        name: 'some-channel'
    },
    workspace: {
        bucket: 'some-bucket'
    },
    filesIn: [],
    filesOut: [],
    steps: {
        sql: {
            finished: false
        }
    }
};
