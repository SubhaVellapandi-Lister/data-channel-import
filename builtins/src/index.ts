import { TranslateProcessor } from "./TranslateProcessor";

export async function TranslateHandler(event: any): Promise<any> {
    const processor = new TranslateProcessor(event.Job);
    await processor.handle(event.TaskToken);

    const response = {
        status: "Work Done"
    };

    return response;
}
