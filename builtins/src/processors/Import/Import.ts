import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    DetailType,
    SourceType,
    IStepBeforeInput,
    IStepAfterInput,
    IImportDetailPayload,
    IImportPayload,
    EventBridge
} from "@data-channels/dcSDK";

import { urlsForInputNames } from "../../utils";

export interface IImportConfig {
    detailType: string;
    pauseAfter: boolean;
}

export class Import extends BaseProcessor {
    private importDetailPayload!: IImportDetailPayload;
    private importPayload!: IImportPayload
    private config!: IImportConfig;

    public async before_import(_input: IStepBeforeInput): Promise<void> {
        this.config = _input.parameters!['importConfig'] ?? { 
            detailType: DetailType.SCORES_IMPORT,
            pauseAfter: true
        };
    }

    public async import(_input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        const url = await this.fileUrls(Object.keys(_input.inputs)[0]);
        
        this.importDetailPayload = {
            schoolId: this.job.tenant?.name,
            testType: this.job.name,
            url,
            importId: `${this.job.guid}/${this.job.currentStep}`
        };

        console.log('Import Detail Payload', this.importDetailPayload);
        
        this.importPayload = {
            Source: SourceType.NAV_PLATFORM,
            DetailType: this.config.detailType,
            Time: new Date(),
            Detail: JSON.stringify(this.importDetailPayload)
        };

        console.log('Import Payload', this.importPayload);

        try {
            await EventBridge.postEvent(this.importPayload);
            console.log('Event has been successfully posted');
            return { results: { sent: true }
            };
        } catch (err) {
            console.log({ error: err });
            return { results: { sent: false }
            };
        }
    }

    public async after_import(_input: IStepAfterInput): Promise<void> {
        if (this.config.pauseAfter) {
            this.pauseAfterStep();
        }
    }

    private async fileUrls(inputName: string): Promise<string> {
        const urls = await this.urlsForInputName(inputName);

        return urls[0] ?? '';
    }
}
