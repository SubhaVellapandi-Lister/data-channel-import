import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    JobStatus,
} from "@data-channels/dcSDK";
import AWS from "aws-sdk";
import _ from "lodash";

export interface ISESParams {
    to: string | string[];
    from?: string;
    failureOnly?: boolean;
    successOnly?: boolean;
    sendFilter?: string;
    template?: {
        subject: string;
        body: string;
        isHtml?: boolean;
    };
}

export function validEmail(email: string): boolean {
    // tslint:disable-next-line
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    return re.test(String(email).toLowerCase());
}

export class SESProcessor extends BaseProcessor {
    private config: ISESParams = {
        to: []
    };

    private initConfig(input: IFileProcessorInput): void {
        const config = input.parameters!['emailConfig'] as ISESParams;
        if (!config.from) {
            config.from = "no-reply@data-channels-dev.hobsonsdev.net";
        }

        config.to = typeof config.to === 'string' ? [config.to] : config.to;

        config.to = config.to.map((addr) => this.templateResolver(addr)).filter((addr) => validEmail(addr));

        this.config = config;
    }

    public async emailJobInfo(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        this.initConfig(input);

        await this.send(
            `Data Channels Job - ${this.job.guid} Finished`,

            JSON.stringify({
                guid: this.job.guid,
                channel: this.job.channelReference,
                steps: this.job.steps
            }, undefined, 2),
            false,
        );

        return {};
    }

    public async email(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        this.initConfig(input);

        if (!this.config.to.length) {
            console.log('No To Addresses Found');

            return { results: { sent: false } };
        }

        if (this.config.successOnly && this.job.status === JobStatus.Failed) {
            return { results: { sent: false } };
        }

        if (this.config.failureOnly && this.job.status !== JobStatus.Failed) {
            return { results: { sent: false } };
        }

        if (this.config.sendFilter) {
            const val = _.get(
                { job: this.job.rawConfig },
                this.config.sendFilter.replace(/\${(.*?)}/g, (x, g) => g)
            );
            if (!val) {
                return { results: { sent: false, sendStatus: "sendFilter not met" } };
            }
        }

        const defaultTemplate = {
            subject: 'Data Channels Job - ${job.name} - ${job.status}',
            body: 'Job has ${job.status} ${job.statusMsg}\n\nStep Results:\n\n${job.steps}',
            isHtml: false
        };

        if (!this.config.template) {
            this.config.template = defaultTemplate;
        }

        const subject = this.templateResolver(this.config.template.subject);
        const body = this.templateResolver(this.config.template.body);
        await this.send(subject, body, this.config.template.isHtml || false);

        return {
            results: {
                sent: true,
                addresses: this.config.to
            }
        };
    }

    private async send(subject: string, body: string, isHtml: boolean): Promise<void> {
        const ses = new AWS.SES();

        const params = {
            Destination: {
                ToAddresses: this.config.to as string[]
            },
            Message: {
                Body: {
                    Text: {
                        Charset: "UTF-8",
                        Data: body
                    }
                },
                Subject: {
                    Charset: "UTF-8",
                    Data: subject
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
    }

    private templateResolver(template: string): string {
        const matcher = (templateString: string, templateVariables: object): string =>
            templateString.replace(/\${(.*?)}/g, (x, g) => {
                let value = _.get(templateVariables, g, '');
                if (typeof value !== 'string') {
                    value = JSON.stringify(value);
                }

                return value;
            });

        return matcher(template, { job: this.job.rawConfig });
    }
}
