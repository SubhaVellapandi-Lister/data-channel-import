import { IJobConfig, JobStatus } from "@data-channels/dcSDK";
import { CourseImportProcessor } from "./Processor";

const job: IJobConfig = {
    guid: '1234567890-009-hisd',

    channel: {
        flow: ['validate', 'batchToAp'],
        steps: {
            validate: {
                inputs: ['mapping', 'courses'],
                outputs: ['mappingValidated', 'coursesValidated'],
                processor: 'data-channels-navianceCourseImport',
                method: 'validate',
                granularity: 'row'
            },
            batchToAp: {
                inputs: ['mappingValidated', 'coursesValidated'],
                processor: 'data-channels-navianceCourseImport',
                method: 'batchToAp',
                granularity: 'row',
                parameters: {
                    rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoJWT: '${ENV:APSDK_JWT}',
                    rulesRepoProduct: 'naviance',
                    namespace: 'dcimport.hisd'
                }
            }
        }
    },
    workspace: {
        bucket: 'data-channels-work-dev1'
    },
    currentStep: 'validate',
    filesIn: [
        {
            s3: {
                bucket: 'data-channels-work-dev1',
                key: 'testing/houston_courses.csv'
            },
            name: 'courses'
        },
        {
            s3: {
                bucket: 'data-channels-work-dev1',
                key: 'testing/houston_mapping.csv'
            },
            name: 'mapping'
        }
    ],
    filesOut: [],
    steps: {
        validate: {
            finished: false
        },
        batchToAp: {
            finished: false
        }
    },
    status: JobStatus.STARTED,
    created: new Date()
};

(async () => {

    // job.guid = `1234567890-${new Date().getTime()}`;
    const processor = new CourseImportProcessor(job);

    // validating

    // await processor.handle();

    console.log(JSON.stringify(processor.job, undefined, 2));

    // validating
    // processor.job.currentStep = 'validate';
    // await processor.handle();

    // processing
    processor.job.currentStep = 'batchToAp';
    await processor.handle();
    console.log(JSON.stringify(processor.job, undefined, 2));

})();
