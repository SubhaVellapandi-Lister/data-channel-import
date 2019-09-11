import { IJobConfig, JobStatus } from "@data-channels/dcSDK";
import { PlanExportProcessor } from "./PlanExportProcessor";
import { ProgramExportProcessor } from "./ProgramExportProcessor";

const plansJob: IJobConfig = {
    guid: '1234567890-export-dev',

    channel: {
        flow: ['export'],
        steps: {
            export: {
                outputs: ['CoursePlans'],
                processor: 'data-channels-naviancePlanExport',
                method: 'export',
                granularity: 'files',
                parameters: {
                    // rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repoqa',
                    rulesRepoProduct: 'naviance',
                    // planningUrl: 'https://api2-ada.hobsonshighered.com/aplan-planning',
                    planningUrl: 'https://turbo-api.hobsonshighered.com/aplan-planqa',
                    JWT: '${ENV:APSDK_JWT}',
                    // schools: ['9110149DUS']
                    schools: ['9947559DUS']
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
                key: 'exports/9947559DUS/CoursePlansDev.csv'
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

const programsJob: IJobConfig = {
    guid: '1234567890-program-export-dev',

    channel: {
        flow: ['export'],
        steps: {
            export: {
                outputs: ['Programs'],
                processor: 'data-channels-naviancePlanExport',
                method: 'export',
                granularity: 'files',
                parameters: {
                    // rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                    rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repoqa',
                    rulesRepoProduct: 'naviance',
                    // planningUrl: 'https://api2-ada.hobsonshighered.com/aplan-planning',
                    planningUrl: 'https://turbo-api.hobsonshighered.com/aplan-planqa',
                    JWT: '${ENV:APSDK_JWT}',
                    schools: ['9947559DUS']
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
            name: 'Programs',
            step: 'export',
            s3: {
                bucket: 'data-channels-work-dev1',
                key: 'exports/9947559DUS/Programs.csv'
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
/*
    plansJob.guid = `1234567890-${new Date().getTime()}`;
    const plansProcessor = new PlanExportProcessor(plansJob, { storeFilesLocal: true });
    await plansProcessor.handle();
    console.log(JSON.stringify(plansProcessor.job, undefined, 2));
*/
    programsJob.guid = ``;
    const programsProcessor = new ProgramExportProcessor(programsJob, { storeFilesLocal: true });
    await programsProcessor.handle();
    console.log(JSON.stringify(programsProcessor.job, undefined, 2));
})();
