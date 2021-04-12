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

export class Import extends BaseProcessor {
    private importDetailPayload!: IImportDetailPayload;
    private importPayload!: IImportPayload

    public async before_import(_input: IStepBeforeInput): Promise<void> {
        this.importDetailPayload = {
            schoolId: this.job.tenant?.name,
            testType: this.job.name,
            url: this.fileUrls(),
            importId: `${this.job.guid}/${this.job.currentStep}`
        };

        console.log('Import Detail Payload', this.importDetailPayload);
    }

    public async import(_input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        this.importPayload = {
            Source: SourceType.NAV_PLATFORM,
            DetailType: DetailType.SCORES_IMPORT,
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
        this.pauseAfterStep();
    }

    private fileUrls(): string {
        const fileUrlsByName = urlsForInputNames(this.job);
        const fileUrls = [];

        for (const inputName of Object.keys(fileUrlsByName)) {
            for (const fileUrl of fileUrlsByName[inputName]) {
                fileUrls.push(fileUrl);
            }
        }
        return fileUrls[0];
    }
}
