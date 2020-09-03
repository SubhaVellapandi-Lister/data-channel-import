import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IRowProcessorInput,
    IRowProcessorOutput
} from "@data-channels/dcSDK";

export default class HelloWorld extends BaseProcessor {
    public async hello(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        return {
            results: {
                hello: "world2",
                parameters: input.parameters,
                inputNames: Object.keys(input.inputs),
                outputNames: Object.keys(input.outputs)
            }
        };
    }

    public async helloRow(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        console.log(`Hello Row ${input.index} ${input.fileIndex}: ${JSON.stringify(input.data)}`);

        return {
            outputs: {
                helloOut: [input.index, `Hello Row ${input.index}`, input.fileIndex]
            }
        };
    }

}
