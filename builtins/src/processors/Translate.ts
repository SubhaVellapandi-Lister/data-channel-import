import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput
} from "@data-channels/dcSDK";

interface ITranslateConfig {
    headers: string[];
    mapping: {
        [name: string]: string;
    };
}

export default class Translate extends BaseProcessor {
    private originalHeaders: string[] = [];

    public async translate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        const config = input.parameters!['translationConfig'] as ITranslateConfig;
        if (input.index === 1) {
            this.originalHeaders = input.raw;

            return {
                index: input.index,
                outputs: {
                    default: config.headers
                }
            };
        }

        const newData: { [key: string]: string } = {};
        for (const [idx, val] of input.raw.entries()) {
            const curHeaderVal = this.originalHeaders[idx];
            if (config.mapping[curHeaderVal]) {
                newData[config.mapping[curHeaderVal]] = val;
            } else {
                newData[curHeaderVal] = val;
            }
        }

        const newRow: string[] = [];
        for (const newHeaderVal of config.headers) {
            newRow.push(newData[newHeaderVal] || '');
        }

        return {
            index: input.index,
            outputs: {
                default: newRow
            }
        };
    }
}
