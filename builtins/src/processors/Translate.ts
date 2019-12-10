import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput
} from "@data-channels/dcSDK";

interface ITranslateConfig {
    headers: string[];
    mapping?: {
        [name: string]: string;
    };
}

export default class Translate extends BaseProcessor {
    private originalHeaders: string[] = [];

    public async translate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {

        const config = input.parameters!['translateConfig'] as ITranslateConfig;
        if (input.index === 1) {
            this.originalHeaders = input.raw;

            return {
                index: input.index,
                outputs: {
                    [`${input.name}Translated`]: config.headers
                }
            };
        }

        const newData: { [key: string]: string } = {};
        for (const [idx, val] of input.raw.entries()) {
            const curHeaderVal = this.originalHeaders[idx];
            if (config.mapping && config.mapping[curHeaderVal]) {
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
                [`${input.name}Translated`]: newRow
            }
        };
    }
}
