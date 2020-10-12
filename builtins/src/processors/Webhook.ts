import {
    BaseProcessor,
    IChannelWebhookConfig,
    IFileProcessorInput,
    IFileProcessorOutput
} from "@data-channels/dcSDK";
import AbortController from 'abort-controller';
import fetch, { RequestInit } from 'node-fetch';
export default class Webhook extends BaseProcessor {
    private config!: IChannelWebhookConfig;
    private defaultTimeOut: number = 30000;

    private initConfig(input: IFileProcessorInput): void {
        this.config = input.parameters!['webhookConfig'] as IChannelWebhookConfig;
    }
    private validateConfig(config: IChannelWebhookConfig): void {
        if (!config.url) {
            throw new Error('no url specified');
        }

        if (!this.config.method) {
            throw new Error('no http method specified');
        }

        if (["GET", "HEAD"].includes(this.config.method) && this.config.body) {
            throw new Error('Request with GET/HEAD method can not have body');
        }
    }
    private setRequestTimeOut(requestOptions: RequestInit): void {
        const controller = new AbortController();
        requestOptions.signal = controller.signal;
        setTimeout(() => {
            controller.abort();
        }, this.config.timeout ?? this.defaultTimeOut);
    }
    private getRequestOptions(): RequestInit {
        const requestOptions: RequestInit = {
            method: this.config.method,
        };

        if (this.config.body) {
            requestOptions.body = JSON.stringify(this.config.body);
        }
        if (this.config.headers) {
            requestOptions.headers = this.config.headers;
        }

        return requestOptions;
    }
    public async webhook(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        this.initConfig(input);
        try {
            this.validateConfig(this.config);
            const requestOptions = this.getRequestOptions();
            this.setRequestTimeOut(requestOptions);
            const result = await fetch(this.config.url, requestOptions);
            console.log(`result status: ${result.status}`);

            return {
                results: {
                    status: result.status,
                    isCalled: true
                }
            };
        } catch (error) {
            console.log('An error has occurred', error.message);

            return {
                results: {
                    isCalled: false,
                    errorMsg: error.message
                }
            };
        }
    }
}
