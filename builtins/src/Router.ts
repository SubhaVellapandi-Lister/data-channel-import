import { BaseProcessor, Job } from "@data-channels/dcSDK";
import Diff from "./processors/Diff";
import Echo from "./processors/Echo";
import GroupBy from "./processors/GroupBy";
import HelloWorld from "./processors/HelloWorld";
import SESPRocessor from "./processors/SES";
import SNSProcessor from "./processors/SNS";
import Sort from "./processors/Sort";
import ThrowError from "./processors/ThrowError";
import Translate from "./processors/Translate";
import Validate from "./processors/Validate";

export default class BuiltInRouter {
    static async handleJobEvent(event: any, context: any) {
        const job = Job.fromConfig(event.Job);
        await job.init();
        const step = job.channelStepDetails(job.currentStep!);

        console.log(`Job ${job.guid} - running ${step!.method}`);
        let processor: BaseProcessor;
        switch (step!.method) {
            case 'translate':
                processor = new Translate(job);
                break;
            case 'sort':
                processor = new Sort(job);
                break;
            case 'validate':
                processor = new Validate(job);
                break;
            case 'hello':
            case 'helloRow':
                processor = new HelloWorld(job);
                break;
            case 'sns':
                processor = new SNSProcessor(job);
                break;
            case 'emailJobInfo':
                processor = new SESPRocessor(job);
                break;
            case 'echo':
                processor = new Echo(job);
                break;
            case 'throwError':
                processor = new ThrowError(job);
                break;
            case 'diff':
                processor = new Diff(job);
                break;
            case 'throwError':
                processor = new ThrowError(job);
                break;
            case 'groupby':
                processor = new GroupBy(job);
                break;
            default:
                throw new Error(`Built-in method ${step!.method} not found`);
        }

        await processor!.handle(context.awsRequestId , event);
    }
}
