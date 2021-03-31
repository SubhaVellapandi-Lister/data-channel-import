import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    DetailType,
    SourceType,
    putEvents,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { EventBridge } from 'aws-sdk/clients/all';
import {
    PutEventsRequestEntry
} from "aws-sdk/clients/eventbridge";
import config from 'config';

import { urlsForInputNames } from "../utils";

interface IImportDetailPayload {
    schoolId: string | undefined;
    testType: string;
    url: string;
    testVersion?: string;
    importId?: string;
}

export class Import extends BaseProcessor {
    private eventBusName: string = config.get<string>('cdk.eventBridge.busName')
    private eventBridge!: EventBridge

    private importDetailPayload!: IImportDetailPayload;
    private importPayload!: PutEventsRequestEntry

    public async before_import(input: IStepBeforeInput): Promise<void> {
        this.eventBridge = new EventBridge({ region: process.env.AWS_REGION || 'us-east-1' });

        this.importDetailPayload = {
            schoolId: this.job.tenant?.name,
            testType: this.job.name,
            url: JSON.stringify(Object.values(urlsForInputNames(this.job))),
            importId: `${this.job.guid}/${this.job.currentStep}`
        };

        console.log('Import Detail Payload', this.importDetailPayload);
    }

    public async import(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        this.importPayload = {
            Source: SourceType.NAV_PLATFORM,
            DetailType: DetailType.SCORES_IMPORT,
            Time: new Date(),
            Detail: JSON.stringify(this.importDetailPayload),
            EventBusName: this.eventBusName
        };

        console.log('Import Payload', this.importPayload);

        try {
            await putEvents(this.eventBridge, [this.importPayload]);
            console.log('Event has been successfully posted');
            return { results: { sent: true }
            };
        } catch (err) {
            console.log({ error: err });
            return { results: { sent: false }
            };
        }
    }
}
