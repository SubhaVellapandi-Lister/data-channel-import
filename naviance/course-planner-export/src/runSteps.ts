import { IJobConfig, JobStatus } from "@data-channels/dcSDK";
import { PlanExportProcessor } from "./Processor";

const job: IJobConfig = {
    guid: '1234567890-export',

    channel: {
        flow: ['export', 'calcIsMet'],
        steps: {
            export: {
                outputs: ['RawCoursePlans'],
                processor: 'data-channels-naviancePlanExport',
                method: 'export',
                granularity: 'files',
                parameters: {
                    // rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                    rulesRepoProduct: 'naviance',
                    // planningUrl: 'https://api2-ada.hobsonshighered.com/aplan-planning',
                    planningUrl: 'https://turbo-api.hobsonshighered.com/aplan-planjwt',
                    JWT: '${ENV:APSDK_JWT}'
                }
            },
            calcIsMet: {
                inputs: ['RawCoursePlans'],
                outputs: ['CoursePlans'],
                processor: 'data-channels-naviancePlanExport',
                method: 'calcIsMet',
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
        },
        calcIsMet: {
            finished: false
        }
    },
    status: JobStatus.STARTED,
    created: new Date()
};

(async () => {
    console.log(JSON.stringify(job, undefined, 2));

    // job.guid = `1234567890-${new Date().getTime()}`;
    let processor = new PlanExportProcessor(job, { storeFilesLocal: true });

    // exporting

    await processor.handle();
    console.log(JSON.stringify(processor.job, undefined, 2));

    job.currentStep = 'calcIsMet';
    processor = new PlanExportProcessor(job, { storeFilesLocal: true });
    await processor.handle();
    console.log(JSON.stringify(processor.job, undefined, 2));

})();
