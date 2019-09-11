import { IJobConfig, JobStatus } from "@data-channels/dcSDK";
import { CourseImportProcessor } from "./Processor";

const job: IJobConfig = {
    guid: '1234567890-7777-import',

    channel: {
        flow: ['validate', 'createSubjects', 'batchToAp'],
        steps: {
            validate: {
                inputs: ['schools', 'mapping', 'courses'],
                outputs: ['schoolsValidated', 'mappingValidated', 'coursesValidated'],
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
                    rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    // rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoJWT: '${ENV:APSDK_JWT}',
                    rulesRepoProduct: 'naviance',
                    namespace: '7802511DUS' // Washington county
                    // namespace: '9110149DUS' // houston dev
                    // namespace: '4823640DUS' // houston prod
                }
            },
            batchToAp: {
                inputs: ['schoolsValidated', 'mappingValidated', 'coursesValidated'],
                processor: 'data-channels-navianceCourseImport',
                method: 'batchToAp',
                granularity: 'row',
                parameters: {
                    rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    // rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoJWT: '${ENV:APSDK_JWT}',
                    rulesRepoProduct: 'naviance',
                    namespace: '7802511DUS' // Washington county
                    // namespace: '9110149DUS' // houston dev
                    // namespace: '4823640DUS' // houston prod
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
                key: 'testing/WCPSMD_Course_Catalog.csv'
            },
            name: 'courses'
        },
        {
            s3: {
                // bucket: 'data-channels-work-dev1',
                bucket: 'data-channels-work-dev1',

                key: 'testing/WCPSMD_Course_Mapping.csv'
            //    key: 'testing/houstonMappingFixed.csv'
            },
            name: 'mapping'
        },
        {
            s3: {
                bucket: 'data-channels-work-dev1',
                key: 'testing/district-7802511DUS.csv'
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
        createSubjects: {
            finished: false
        },
        batchToAp: {
            finished: false
        }
    },
    status: JobStatus.STARTED,
    created: new Date()
};

const noMappingJob: IJobConfig = {
    guid: '1234567890-01234-import-no-mapping',

    channel: {
        flow: ['validate', 'createSubjects', 'batchToAp'],
        steps: {
            validate: {
                inputs: ['courses'],
                outputs: ['coursesValidated'],
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
                    rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    // rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoJWT: '${ENV:APSDK_JWT}',
                    rulesRepoProduct: 'naviance',
                    namespace: '17875USPU' // beechwood
                    // namespace: '9110149DUS' // houston dev
                    // namespace: '4823640DUS' // houston prod
                }
            },
            batchToAp: {
                inputs: ['coursesValidated'],
                processor: 'data-channels-navianceCourseImport',
                method: 'batchToAp',
                granularity: 'row',
                parameters: {
                    rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    // rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoJWT: '${ENV:APSDK_JWT}',
                    rulesRepoProduct: 'naviance',
                    namespace: '17875USPU', // beechwood
                    singleHighschoolId: '17875USPU'
                    // namespace: '9110149DUS' // houston dev
                    // namespace: '4823640DUS' // houston prod
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
                key: 'testing/BHS_Course_Catalog.csv'
            },
            name: 'courses'
        }
    ],
    filesOut: [],
    steps: {
        validate: {
            finished: false
        },
        createSubjects: {
            finished: false
        },
        batchToAp: {
            finished: false
        }
    },
    status: JobStatus.STARTED,
    created: new Date()
};

const migrateJob: IJobConfig = {
    guid: '1234567890-01234-course-migrate',

    channel: {
        flow: ['validate', 'createSubjects', 'batchToAp'],
        steps: {
            validate: {
                inputs: ['courses'],
                outputs: ['coursesValidated'],
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
                    rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    // rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoJWT: '${ENV:APSDK_JWT}',
                    rulesRepoProduct: 'naviance',
                    namespace: '43618USPU'
                }
            },
            batchToAp: {
                inputs: ['coursesValidated'],
                processor: 'data-channels-navianceCourseImport',
                method: 'batchToAp',
                granularity: 'row',
                parameters: {
                    rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    // rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoJWT: '${ENV:APSDK_JWT}',
                    rulesRepoProduct: 'naviance',
                    namespace: '43618USPU'
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
                key: 'testing/highschool-43618USPU.csv'
            },
            name: 'courses'
        },
    ],
    filesOut: [],
    steps: {
        validate: {
            finished: false
        },
        createSubjects: {
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
    // await processor.handle();
    // console.log(JSON.stringify(processor.job, undefined, 2));

    // creating subjects
    // processor.job.currentStep = 'createSubjects';
    // await processor.handle();
    // console.log(JSON.stringify(processor.job, undefined, 2));

    // processing
    processor.job.currentStep = 'batchToAp';
    await processor.handle();
    console.log(JSON.stringify(processor.job, undefined, 2));

})();
