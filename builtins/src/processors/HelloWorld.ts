import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput
} from "@data-channels/dcSDK";

export default class HelloWorld extends BaseProcessor {
    public async hello(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        return {
            results: {
                hello: "world",
                parameters: input.parameters,
                inputNames: Object.keys(input.inputs),
                outputNames: Object.keys(input.outputs)
            }
        };
    }

}
