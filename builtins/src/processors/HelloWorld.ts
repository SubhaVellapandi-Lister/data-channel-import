import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IRowProcessorInput,
    IRowProcessorOutput
} from "@data-channels/dcSDK";

export class HelloWorld extends BaseProcessor {
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
        console.log(`Hello Row ${input.index} ${input.fileInfo!.key}: ${JSON.stringify(input.data)}`);

        return {
            outputs: {
                helloOut: [input.index, `Hello Row ${input.index}`, input.fileIndex]
            }
        };
    }

    public async dynamicHelloWorld(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        const name = input.fileInfo?.key?.match(new RegExp(`(${input.name}\\d?)\\.csv`))?.[1] ?? 'fail';

        if (input.index === 1) {
            await this.createOutput({
                name: `dynOut${name}`,
                details: {
                    name: `dynOut${name}`,
                    s3: {
                        key: `${input.parameters!['key']}/dynamic${name}.csv`,
                        bucket: this.job.workspace!.bucket
                    }
                }
            });

            await this.createInput({ name: `dynOut${name}`, step: 'helloRow' });
        }

        return {
            outputs: {
                [`dynOut${name}`]: input.raw
            }
        };
    }
}
