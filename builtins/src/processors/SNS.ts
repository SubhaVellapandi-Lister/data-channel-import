import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
} from "@data-channels/dcSDK";
import AWS from "aws-sdk";

export interface ISNSParams {
    arn: string;
}

export class SNSProcessor extends BaseProcessor {
    public async sns(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        const inputParams = input.parameters as ISNSParams;

        const sns = new AWS.SNS();

        const subject = `Data Channels Job - ${this.job.guid} Finished`;
        const message = JSON.stringify({
            guid: this.job.guid,
            channel: this.job.channelReference,
            steps: this.job.steps }, undefined, 2);

        const snsParams = {
            Message: message,
            Subject: subject,
            TopicArn: inputParams.arn
        };

        await new Promise((resolve, reject) => {
            sns.publish(snsParams, (err, data) => {
                if (err) {
                    console.log(err, err.stack);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        return {};
    }
}
