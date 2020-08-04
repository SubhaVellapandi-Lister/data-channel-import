import { JobStatus, jobWithInlineChannel } from "@data-channels/dcSDK";
import _ from "lodash";
import { PlanCreateProcessor } from "../PlanCreateProcessor";

const normalJob = {
    guid: '1234567890-planCreate-import',
    channel: {
        flow: ['createPlans'],
        steps: {
            createPlans: {
                inputs: ['students'],
                processor: 'data-channels-naviancePlanCreateImport',
                method: 'createPlans',
                granularity: 'row',
                parameters: {
                    rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repoqa',
                    planningUrl: 'https://turbo-api.hobsonshighered.com/aplan-planqa',
                    rulesRepoJWT: '${ENV:APSDK_JWT}',
                    rulesRepoProduct: 'naviance',
                    namespace: ''
                }
            }
        }
    },
    workspace: {
        bucket: 'data-channels-work-dev1'
    },
    currentStep: 'createPlans',
    filesIn: [],
    steps: {
        createPlans: {
            finished: false
        }
    }
};

async function processJob(jobToRun: any, namespace: string, filesIn: any[]) {
    const mjob = _.merge(_.cloneDeep(jobToRun), {
        guid: `1234567890-planCreate-import-${namespace}`,
        channel: {
            steps: {
                createPlans: {
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

    const processor = new PlanCreateProcessor(jobObj, { storeFilesLocal: true });

    console.log(JSON.stringify(processor.job, undefined, 2));
    await processor.processAll('');
    console.log(JSON.stringify(processor.job, undefined, 2));
}

// tslint:disable-next-line
(async () => {
    await processJob(
        normalJob,
        '9947591DUS',
        [
            {
                s3: {
                    bucket: 'data-channels-work-dev1',
                    key: 'ready/testing/Student Data - District 9947591DUS.csv'
                },
                name: 'students'
            }
        ]
    );

})();
