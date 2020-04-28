import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput
} from "@data-channels/dcSDK";

export default class ThrowError extends BaseProcessor {

    public async throwError(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        throw new Error('error from built-in processor');

        return {
            outputs: {}
        };
    }

}
