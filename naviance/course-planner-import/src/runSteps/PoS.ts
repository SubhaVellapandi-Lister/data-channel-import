import { JobStatus, jobWithInlineChannel } from "@data-channels/dcSDK";
import _ from "lodash";
import { PosProcessor } from "../PosProcessor";

const normalJob = {
    guid: '1234567890-pos-import',
    channel: {
        flow: ['importPoS'],
        steps: {
            importPoS: {
                inputs: ['pos'],
                processor: 'data-channels-naviancePoSImport',
                method: 'importPoS',
                granularity: 'row',
                parameters: {
                    rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    // rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
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
    currentStep: 'importPoS',
    filesIn: [],
    steps: {
        importPoS: {
            finished: false
        }
    }
};

async function processJob(jobToRun: any, namespace: string, filesIn: any[]) {
    const mjob = _.merge(_.cloneDeep(jobToRun), {
        guid: `1234567890-pos-import-${namespace}`,
        channel: {
            steps: {
                importPoS: {
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

    const processor = new PosProcessor(jobObj, { storeFilesLocal: true });

    console.log(JSON.stringify(processor.job, undefined, 2));
    await processor.processAll();
    console.log(JSON.stringify(processor.job, undefined, 2));
}

(async () => {
    // lincoln
    /*await processJob(
        normalJob,
        '2930450DUS',
        [
            {
                s3: {
                    bucket: 'data-channels-work-dev1',
                    key: 'ready/testing/district-plans-of-study-2930450DUS.csv'
                },
                name: 'pos'
            }
        ]
    );

    // fairfax
    await processJob(
        normalJob,
        '5101260DUS',
        [
            {
                s3: {
                    bucket: 'data-channels-work-dev1',
                    key: 'ready/testing/district-plans-of-study-5101260DUS.csv'
                },
                name: 'pos'
            }
        ]
    );

    // fairfax trainer
    await processJob(
        normalJob,
        '7800043DUS',
        [
            {
                s3: {
                    bucket: 'data-channels-work-dev1',
                    key: 'ready/testing/Fairfax_Trainer_PoS.csv'
                },
                name: 'pos'
            }
        ]
    );*/

    // msd wayne
    /*await processJob(
        normalJob,
        '1812810DUS',
        [
            {
                s3: {
                    bucket: 'data-channels-work-dev1',
                    key: 'ready/testing/district-plans-of-study-1812810DUS.csv'
                },
                name: 'pos'
            }
        ]
    ); */

    /* simi */
    /* await processJob(
        normalJob,
        '0636840DUS',
        [
            {
                s3: {
                    bucket: 'data-channels-work-dev1',
                    key: 'ready/testing/district-plans-of-study-0636840DUS.csv'
                },
                name: 'pos'
            }
        ]
    );
    */

    // stlucie
    await processJob(
        normalJob,
        '1201770DUS',
        [
            {
                s3: {
                    bucket: 'data-channels-work-dev1',
                    key: 'ready/testing/district-plans-of-study-1201770DUS.csv'
                },
                name: 'pos'
            }
        ]
    );

})();
