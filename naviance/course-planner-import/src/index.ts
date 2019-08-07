import { CourseImportProcessor } from "./Processor";

export async function courseImportHandler(event: any): Promise<any> {
    const processor = new CourseImportProcessor(event.Job);
    await processor.handle(event.TaskToken);

    const response = {
        status: "Work Done"
    };

    return response;
}
