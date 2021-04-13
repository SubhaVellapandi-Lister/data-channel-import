import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";

import { IDragonImportConfig } from "./DragonImport.interface";

export class DragonImport extends BaseProcessor {
    private config: IDragonImportConfig = {};

    public async before_dragonImport(input: IStepBeforeInput): Promise<void> {
        this.config = (input.parameters!['dragonImportConfig'] || {}) as IDragonImportConfig;
    }

    public async dragonImport(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        return {};
    }
}
