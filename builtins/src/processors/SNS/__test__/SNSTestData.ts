import { ConfigType, IJobConfig, IFileProcessorInput, JobStatus, jobWithInlineChannel } from "@data-channels/dcSDK";

import { SNSProcessor, ISNSParams } from "../SNS";

// ------------------------- Input Configs ---------------------------------------
export const snsInputConfig: IFileProcessorInput = {
    parameters: {
        arn: "dummy-arn"
    },
    inputs: {},
    outputs: {}
};

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
    flow: ["sns"],
    steps: { sns: { method: "sns" } },
    systemFailureRetries: 1,
    inheritOnly: false
};

export const jobConfig = {
    guid: "some-guid-here",
    created: new Date(),
    name: "some-job",
    isDeleted: false,
    currentStep: "sns",
    flow: ["sns"],
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
        sns: { finished: false }
    }
};
//-------------------------- Test Data --------------------------------------
export function getSNSProcessor(): SNSProcessor {
    const snsProcessor = new SNSProcessor(jobWithInlineChannel(jobConfig, channelConfig));
    snsProcessor.createOutput = jest.fn().mockReturnValue(``);
    snsProcessor.createInput = jest.fn().mockReturnValue(``);
    return snsProcessor;
}
