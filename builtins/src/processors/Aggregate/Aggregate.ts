import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";

import { IAggregateConfig, IAggregateStoredValues } from "./Aggregate.interface";

export class Aggregate extends BaseProcessor {
    private config: IAggregateConfig = {};
    private storedRows: IAggregateStoredValues = {};

    public async before_aggregate(input: IStepBeforeInput): Promise<void> {
        this.config = (input.parameters!['aggregateConfig'] || {}) as IAggregateConfig;
    }

    public async aggregate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        const outputName = `aggregatedLog`;

        return {
            outputs: {
                [outputName]: input.raw
            }
        };
    }
}
