import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
} from "@data-channels/dcSDK";
import AWS from "aws-sdk";

export interface ISESParams {
    to: string | string[];
    from?: string;
}

export default class SESProcessor extends BaseProcessor {
    public async emailJobInfo(input: IFileProcessorInput): Promise<IFileProcessorOutput> {

        const config = input.parameters as ISESParams;

        const toAddresses = typeof config.to === 'string' ? [config.to] : config.to;

        const ses = new AWS.SES();

        /* The following example sends a formatted email: */

        const params = {
            Destination: {
                ToAddresses: toAddresses
            },
            Message: {
                Body: {
                    Text: {
                        Charset: "UTF-8",
                        Data: JSON.stringify({
                            guid: this.job.guid,
                            channel: this.job.channelReference,
                            steps: this.job.steps
                        }, undefined, 2)
                    }
                },
                Subject: {
                        Charset: "UTF-8",
                        Data: `Data Channels Job - ${this.job.guid} Finished`
                }
            },
            Source: "no-reply@data-channels-dev.hobsonsdev.net"
        };

        await new Promise((resolve, reject) => {
            ses.sendEmail(params, (err, data) => {
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
