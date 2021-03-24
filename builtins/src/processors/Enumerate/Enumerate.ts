import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";

import { IEnumerateConfig } from "./Enumerate.interface";

export class Enumerate extends BaseProcessor {
    private config: IEnumerateConfig = {};

    public async before_enumerate(input: IStepBeforeInput): Promise<void> {
        this.config = (input.parameters!['enumerateConfig'] || {}) as IEnumerateConfig;
    }

    public async enumerate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        const outputName = (this.config.outputNames ?? {})[input.name] ?? `${input.name}Enumerated`;

        if (input.index === 1) {
            return {
                outputs: {
                    [outputName]: [this.config.indexColumnName ?? 'index'].concat(input.raw)
                }
            };
        }

        return {
            outputs: {
                [outputName]: [input.index.toString()].concat(input.raw)
            }
        };
    }
}
