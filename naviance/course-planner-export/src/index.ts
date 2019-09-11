import { PlanExportProcessor } from "./PlanExportProcessor";

export async function planExportHandler(event: any): Promise<any> {
    const processor = new PlanExportProcessor(event.Job);
    await processor.handle(event.TaskToken);

    const response = {
        status: "Work Done"
    };

    return response;
}
