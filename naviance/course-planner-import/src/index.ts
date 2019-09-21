import { jobWithInlineChannel } from "@data-channels/dcSDK";
import { CourseImportProcessor } from "./Processor";

export async function courseImportHandler(event: any): Promise<any> {
    const jobConf = event.Job;
    const channelConfig = Object.assign({}, jobConf.channel);
    jobConf.channel = {};

    const job = jobWithInlineChannel(jobConf, channelConfig);
    const processor = new CourseImportProcessor(job);
    await processor.handle(event.TaskToken);

    const response = {
        status: "Work Done"
    };

    return response;
}
