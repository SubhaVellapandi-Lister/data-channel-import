import { BaseProcessor, Job } from "@data-channels/dcSDK";
import HelloWorld from "./processors/HelloWorld";
import Translate from "./processors/Translate";

export default class BuiltInRouter {
    static async handleJobEvent(event: any) {
        const job = Job.fromConfig(event.Job);
        await job.init();
        const step = job.channelStepDetails(job.currentStep!);

        let processor: BaseProcessor;
        switch (step!.method) {
            case 'translate': {
                processor = new Translate(job);
                break;
            }
            case 'hello': {
                processor = new HelloWorld(job);
                break;
            }
            default: {
                throw new Error(`Built-in method ${step!.method} not found`);
            }
        }

        await processor!.handle(event.TaskToken);
    }
}
