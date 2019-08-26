import { IJobConfig, JobStatus } from "@data-channels/dcSDK";
import { CourseImportProcessor } from "./Processor";

const job: IJobConfig = {
    guid: '1234567890-011-hisd',

    channel: {
        flow: ['validate', 'createSubjects', 'batchToAp'],
        steps: {
            validate: {
                inputs: ['schools', 'mapping', 'courses'],
                outputs: ['mappingValidated', 'coursesValidated'],
                processor: 'data-channels-navianceCourseImport',
                method: 'validate',
                granularity: 'row'
            },
            createSubjects: {
                inputs: ['coursesValidated'],
                processor: 'data-channels-navianceCourseImport',
                method: 'createSubjects',
                granularity: 'row',
                parameters: {
                    // rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoJWT: '${ENV:APSDK_JWT}',
                    rulesRepoProduct: 'naviance',
                    namespace: '9110149DUS'
                    // namespace: '4823640DUS'
                }
            },
            batchToAp: {
                inputs: ['schoolsValidated', 'mappingValidated', 'coursesValidated'],
                processor: 'data-channels-navianceCourseImport',
                method: 'batchToAp',
                granularity: 'row',
                parameters: {
                    // rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoJWT: '${ENV:APSDK_JWT}',
                    rulesRepoProduct: 'naviance',
                    namespace: '9110149DUS'
                    // namespace: '4823640DUS'
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
                key: 'testing/houston_courses_partial.csv'
            },
            name: 'courses'
        },
        {
            s3: {
                bucket: 'data-channels-work-dev1',
                key: 'testing/houstonDevMapping.csv'
            //    key: 'testing/houstonMappingFixed.csv'
            },
            name: 'mapping'
        },
        {
            s3: {
                bucket: 'data-channels-work-dev1',
                key: 'testing/houstonSchoolIds.csv'
            //    key: 'testing/houstonMappingFixed.csv'
            },
            name: 'schools'
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

    console.log(JSON.stringify(job, undefined, 2));

    // job.guid = `1234567890-${new Date().getTime()}`;
    const processor = new CourseImportProcessor(job, { storeFilesLocal: true });

    // validating

    await processor.handle();
    console.log(JSON.stringify(processor.job, undefined, 2));

    // processing
    processor.job.currentStep = 'batchToAp';
    await processor.handle();
    console.log(JSON.stringify(processor.job, undefined, 2));

})();
