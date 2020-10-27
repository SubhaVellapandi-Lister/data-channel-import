import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput
} from "@data-channels/dcSDK";

import { sleep } from "../utils";

export enum ErrorType {
    ExceptionError = "exception",
    TimeoutError = "timeout",
    MemoryError = "memory"
}

export interface IThrowErrorConfig {
    errorType?: ErrorType;
    delaySeconds?: number;
}

export class ThrowError extends BaseProcessor {
    public async throwError(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        const config = input.parameters as IThrowErrorConfig;

        if (config.delaySeconds) {
            await sleep(config.delaySeconds * 1000);
        }

        if (config.errorType === ErrorType.TimeoutError) {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                await sleep(1000);
            }
        }

        if (config.errorType === ErrorType.MemoryError) {
            const someArray = [];
            // eslint-disable-next-line no-constant-condition
            while (true) {
                someArray.push('MeWantCookie!'.repeat(1000));
            }
        }

        throw new Error('error from built-in processor');
    }
}
