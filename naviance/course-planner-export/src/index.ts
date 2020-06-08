import { BaseProcessor, Job } from "@data-channels/dcSDK";
import { CoursesExportProcessor } from "./processors/CoursesExportProcessor";
import { MappingExportProcessor } from "./processors/MappingExportProcessor";
import { ProgramExportProcessor } from "./processors/ProgramExportProcessor";
import { RecommendationExportProcessor } from "./processors/RecommendationExportProcessor";
import { SchoolsProcessor } from "./processors/SchoolsProcessor";
import { StudentCourseExportProcessor } from "./processors/StudentCourseExportProcessor";

export async function exportHandler(event: any, context: any): Promise<any> {
    const job = Job.fromConfig(event.Job);
    await job.init();
    const step = job.channelStepDetails(job.currentStep!);

    console.log(`Starting step ${step!.method}`);
    let processor: BaseProcessor;
    switch (step!.method) {
        case 'findSchools': {
            processor = new SchoolsProcessor(job);
            break;
        }
        case 'exportPrograms': {
            processor = new ProgramExportProcessor(job);
            break;
        }
        case 'exportStudentCourses': {
            processor = new StudentCourseExportProcessor(job);
            break;
        }
        case 'exportRecommendations': {
            processor = new RecommendationExportProcessor(job);
            break;
        }
        case 'exportMappings': {
            processor = new MappingExportProcessor(job);
            break;
        }
        case 'exportCourses': {
            processor = new CoursesExportProcessor(job);
            break;
        }
        default: {
            const errorMsg = `Export Method ${step!.method} Not Found`;
            await job.terminalError('Export Method Routing', errorMsg , event.TaskToken);
            throw new Error(errorMsg);
        }
    }

    await processor.handle(context.awsRequestId, event.TaskToken);
    console.log(`job ${job.guid} status ${job.status} ${job.statusMessage}`);

    const response = {
        status: "Work Done"
    };

    return response;
}
