import { JobStatus, jobWithInlineChannel } from "@data-channels/dcSDK";
import _ from "lodash";
import { CourseImportProcessor } from "../Processor";

const normalJob = {
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
    }
};

const noMappingJob = {
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
                    // singleHighschoolId: '17875USPU'
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
    }
};

const migrateJob = {
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
                    namespace: '43618USPU' // horn
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
                    namespace: '43618USPU' // horn
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
    }
};

async function processJob(jobToRun: any, namespace: string, filesIn: any[]) {
    const mjob = _.merge(jobToRun, {
        guid: `1234567890-migrate-${namespace}`,
        channel: {
            steps: {
                createSubjects: {
                    parameters: {
                        namespace
                    }
                },
                batchToAp: {
                    parameters: {
                        namespace
                    }
                }
            }
        },
        filesIn
    });

    const channelConfig = Object.assign({}, mjob.channel);
    mjob.channel = {};

    const jobObj = jobWithInlineChannel(mjob, channelConfig);

    const processor = new CourseImportProcessor(jobObj, { storeFilesLocal: true });

    console.log(JSON.stringify(processor.job, undefined, 2));
    await processor.processAll();
    console.log(JSON.stringify(processor.job, undefined, 2));
}

async function migrate(fullSchoolId: string) {
    const ns = fullSchoolId.split('-')[1];
    await processJob(migrateJob, ns, [
        {
            s3: {
                bucket: 'data-channels-naviance-migrations',
                key: `production/courses/${fullSchoolId}.csv`
            },
            name: 'courses'
        },
    ]);
}

async function noMapping(ns: string, bucket: string, key: string, singleHighSchool?: boolean) {
    let nmJob = Object.assign({}, noMappingJob);
    if (singleHighSchool) {
        nmJob = _.merge(nmJob, {
            channel: {
                steps: {
                    batchToAp: {
                        parameters: {
                            singleHighschoolId: ns
                        }
                    }
                }
            }
        });
    }
    await processJob(nmJob, ns, [
        {
            s3: {
                bucket,
                key
            },
            name: 'courses'
        }
    ]);
}

(async () => {

    await migrate('district-1201770DUS');

    // await noMapping('2400480DUS', 'data-channels-sftp-dev1', 'montgomeryschoolsmd/CourseCatalog.csv');

    /* await noMapping('1301290DUS', 'data-channels-naviance-migrations',
        'production/courses/highschool-15295USPU.csv', true); */

    /* await processJob(
        normalJob,
        '2400480DUS',
        [
            {
                s3: {
                    bucket: 'data-channels-sftp-dev1',
                    key: 'montgomeryschoolsmd/CourseCatalog.csv'
                },
                name: 'courses'
            },
            {
                s3: {
                    bucket: 'data-channels-sftp-dev1',
                    key: 'montgomeryschoolsmd/CourseMapping.csv'
                },
                name: 'mapping'
            },
            {
                s3: {
                    bucket: 'data-channels-naviance-migrations',
                    key: 'production/schoolIdMappings/district-2400480DUS.csv'
                },
                name: 'schools'
            }
        ]
    ); */

})();
