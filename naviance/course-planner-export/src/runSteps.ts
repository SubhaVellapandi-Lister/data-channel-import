import { JobStatus, jobWithInlineChannel } from "@data-channels/dcSDK";
import { PlanExportProcessor } from "./PlanExportProcessor";
import { ProgramExportProcessor } from "./ProgramExportProcessor";

const plansChannelConfig = {
    flow: ['findSchools', 'export'],
    steps: {
        findSchools: {
            processor: 'data-channels-naviancePlanExport',
            method: 'findSchools',
            granularity: 'once',
            parameters: {
                // rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                rulesRepoProduct: 'naviance',
                // planningUrl: 'https://api2-ada.hobsonshighered.com/aplan-planning',
                planningUrl: 'https://turbo-api.hobsonshighered.com/aplan-planjwt',
                JWT: '${ENV:APSDK_JWT}',
            }
        },
        export: {
            outputs: ['${steps.findSchools.output.schools}'],
            processor: 'data-channels-naviancePlanExport',
            method: 'export',
            granularity: 'oncePerOutput',
            parameters: {
                // rulesRepoUrl: 'https://api2-ada.hobsonshighered.com/aplan-repository',
                rulesRepoUrl: 'https://turbo-api.hobsonshighered.com/aplan-repojwt',
                rulesRepoProduct: 'naviance',
                // planningUrl: 'https://api2-ada.hobsonshighered.com/aplan-planning',
                planningUrl: 'https://turbo-api.hobsonshighered.com/aplan-planjwt',
                JWT: '${ENV:APSDK_JWT}',
                // schools: ['9110149DUS']
            }
        }
    }
};

const plansJob = {
    guid: '1234567890-plans-export-dev',
    workspace: {
        bucket: 'data-channels-work-dev1'
    },
    currentStep: 'findSchools',
    filesOut: [
        {
            name: '${steps.findSchools.output.schools}',
            s3: {
                bucket: 'data-channels-work-dev1',
                key: 'exports/tenant=${name}/coursePlans.csv'
            }
        }
    ],
    steps: {
        findSchools: {
            finished: false
        },
        export: {
            finished: false
        }
    }
};

const programChannelsConfig = {
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
};

const programsJob = {
    guid: '1234567890-program-export-dev',
    workspace: {
        bucket: 'data-channels-work-dev1'
    },
    currentStep: 'export',
    filesIn: [],
    filesOut: [
        {
            name: 'Programs',
            s3: {
                bucket: 'data-channels-work-dev1',
                key: 'exports/9947559DUS/Programs.csv'
            }
        }
    ],
    steps: {
        findTenants: {
            finished: false
        },
        export: {
            finished: false
        }
    },
    status: JobStatus.Started,
    created: new Date()
};

(async () => {

    // plansJob.guid = `1234567890-${new Date().getTime()}`;
    const job = jobWithInlineChannel(plansJob, plansChannelConfig);
    const plansProcessor = new PlanExportProcessor(job, { storeFilesLocal: true });
    await plansProcessor.processAll();
    console.log(JSON.stringify(plansProcessor.job, undefined, 2));

/*    programsJob.guid = ``;
    const programsProcessor = new ProgramExportProcessor(programsJob, { storeFilesLocal: true });
    await programsProcessor.handle();
    console.log(JSON.stringify(programsProcessor.job, undefined, 2));
    */
})();
