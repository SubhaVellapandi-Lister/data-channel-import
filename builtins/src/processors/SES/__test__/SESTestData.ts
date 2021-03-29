import { ConfigType, IJobConfig, IFileProcessorInput, JobStatus, jobWithInlineChannel } from "@data-channels/dcSDK";

import { SESProcessor, ISESParams } from "../SES";

// ------------------------- Input Configs ---------------------------------------
function createInput(emailConfig: ISESParams): IFileProcessorInput {
    return {
        parameters: { emailConfig },
        inputs: {},
        outputs: {}
    };
}

const simpleInfoEmailConfig: ISESParams = {
    to: "test@receiver.com"
};

const basicEmailConfig: ISESParams = {
    from: "no-reply@data-channels-dev.hobsonsdev.net",
    to: ["test@receiver.com"]
};

export const emailConfigFailOnly = createInput({
    ...basicEmailConfig,
    failureOnly: true
});

export const emailConfigSuccessOnly = createInput({
    ...basicEmailConfig,
    successOnly: true
});

export const emailConfigWithTemplate = createInput({
    ...basicEmailConfig,
    template: {
        subject: 'This is custom subject',
        body: 'This is custom body',
        isHtml: true
    }
});

export const emailConfigWithFilter = createInput({
    ...basicEmailConfig,
    sendFilter: "some-filter"
});

export const emailConfigEmptyTo = createInput({
    ...basicEmailConfig,
    to: []
});

export const simpleInfoEmailInput = createInput(simpleInfoEmailConfig);

// ------------------------- Meta Data Configs ---------------------------------------
export const channelConfig = {
    guid: "some-channel-guid",
    product: "some-product",
    name: "some-channel",
    configType: ConfigType.CHANNEL,
    isDeleted: false,
    noTaskLogs: false,
    detailsGuid: "some-channel-details-guid",
    isLatest: true,
    created:  new Date(),
    replaced: new Date(),
    author: "",
    flow: ["email"],
    steps: { email: { method: "email" } },
    systemFailureRetries: 1,
    inheritOnly: false
};

export const startedJobConfig = {
    guid: "some-guid-here",
    created: new Date(),
    name: "some-job",
    isDeleted: false,
    currentStep: "email",
    flow: ["email"],
    flowIdx: 0,
    status: JobStatus.Started,
    statusMsg: "",
    channel: {
        guid: "some-channel-guid-here",
        name: "some-channel"
    },
    filesIn: [],
    filesOut: [],
    steps: {
        email: { finished: false }
    }
};

export const failedJobConfig = {
    guid: "some-guid-here",
    created: new Date(),
    name: "some-job",
    isDeleted: false,
    currentStep: "email",
    flow: ["email"],
    flowIdx: 0,
    status: JobStatus.Failed,
    statusMsg: "",
    channel: {
        guid: "some-channel-guid-here",
        name: "some-channel"
    },
    filesIn: [],
    filesOut: [],
    steps: {
        email: { finished: false }
    }
};

//-------------------------- Test Data --------------------------------------
export function getSESProcessor(jobConfig: IJobConfig): SESProcessor {
    const sesProcessor = new SESProcessor(jobWithInlineChannel(jobConfig, channelConfig));
    sesProcessor.createOutput = jest.fn().mockReturnValue(``);
    sesProcessor.createInput = jest.fn().mockReturnValue(``);
    return sesProcessor;
}
