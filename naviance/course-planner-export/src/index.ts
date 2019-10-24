import { BaseProcessor, Job } from "@data-channels/dcSDK";
import { PlanExportProcessor } from "./PlanExportProcessor";
import { ProgramExportProcessor } from "./ProgramExportProcessor";
import { SchoolsProcessor } from "./SchoolsProcessor";

export async function exportHandler(event: any): Promise<any> {
    const job = Job.fromConfig(event.Job);
    await job.init();
    const step = job.channelStepDetails(job.currentStep!);

    let processor: BaseProcessor;
    switch (step!.method) {
        case 'findSchools': {
            processor = new SchoolsProcessor(job);
            break;
        }
        case 'exportPlans': {
            processor = new PlanExportProcessor(job);
            break;
        }
        case 'exportPrograms': {
            processor = new ProgramExportProcessor(job);
            break;
        }
        default: {
            const errorMsg = `Export Method ${step!.method} Not Found`;
            await job.terminalError('Export Method Routing', errorMsg , event.TaskToken);
            throw new Error(errorMsg);
        }
    }

    await processor.handle(event.TaskToken);
    console.log(`job ${job.guid} status ${job.status} ${job.statusMessage}`);

    const response = {
        status: "Work Done"
    };

    return response;
}
