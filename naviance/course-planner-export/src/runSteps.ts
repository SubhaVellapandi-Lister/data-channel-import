import { IJobConfig, JobStatus } from "@data-channels/dcSDK";
import { PlanExportProcessor } from "./Processor";

const job: IJobConfig = {
    guid: '1234567890-export-099',

    channel: {
        flow: ['export'],
        steps: {
            export: {
                outputs: ['CoursePlans'],
                processor: 'data-channels-naviancePlanExport',
                method: 'export',
                granularity: 'files',
                parameters: {
                    rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    // rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoProduct: 'naviance',
                    planningUrl: 'https://api2-ada.hobsonshighered.com/aplan-planning',
                    // planningUrl: 'https://turbo-api.hobsonshighered.com/aplan-planjwt',
                    JWT: '${ENV:APSDK_JWT}',
                    // schools: ['9110149DUS']
                    schools: [
                        '7803403DUS',
                        '4816230DUS',
                        '4823640DUS',
                        '7803362DUS',
                        '7802518DUS',
                        '4814730DUS',
                        '7802622DUS',
                        '7802691DUS',
                        '7800033DUS',
                        '181724USPU',
                        '4835100DUS',
                        '7802592DUS',
                        '9110170DUS',
                        '1810650DUS'
                    ]
                }
            }
        }
    },
    workspace: {
        bucket: 'data-channels-work-dev1'
    },
    currentStep: 'export',
    filesIn: [],
    filesOut: [
        {
            name: 'CoursePlans',
            step: 'export',
            s3: {
                bucket: 'data-channels-work-dev1',
                key: 'exports/CoursePlans.csv'
            }
        }
    ],
    steps: {
        export: {
            finished: false
        }
    },
    status: JobStatus.STARTED,
    created: new Date()
};

(async () => {
    console.log(JSON.stringify(job, undefined, 2));

    // job.guid = `1234567890-${new Date().getTime()}`;
    const processor = new PlanExportProcessor(job, { storeFilesLocal: true });

    // exporting

    await processor.handle();
    console.log(JSON.stringify(processor.job, undefined, 2));

})();
