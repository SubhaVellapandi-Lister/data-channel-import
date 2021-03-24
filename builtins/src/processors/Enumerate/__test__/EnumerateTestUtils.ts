import { ConfigType, JobStatus, jobWithInlineChannel } from '@data-channels/dcSDK';
import _ from 'lodash';

import { Enumerate } from '../Enumerate';
import { IEnumerateConfig } from '../Enumerate.interface';

export const testEnumerateConfig: IEnumerateConfig = {
    indexColumnName: "someIndex",
    outputNames: {
        input1: "indexedInput"
    }
};

export const testJobConfig = {
    guid: "some-guid",
    created: new Date(),
    name: "some-job",
    isDeleted: false,
    currentStep: "enumerate",
    flow: ["enumerate", "dummyNextStep"],
    status: JobStatus.Started,
    statusMsg: "",
    filesIn: [],
    filesOut: [],
    steps: {
        enumerate: {
            finished: false
        },
        dummyNextStep: {
            finished: false
        }
    }
};

export const testChannelConfig = {
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
    flow: ["enumerate"],
    steps: {
        enumerate: {
            method: "enumerate",
            processor: "some-processor-name",
            parameters: {
                enumerateConfig: _.cloneDeep(testEnumerateConfig)
            },
            granularity: "once"
        }
    },
    systemFailureRetries: 1,
    inheritOnly: false
};

export function getEnumerateProcessor(): Enumerate {
    const job = jobWithInlineChannel(testJobConfig, testChannelConfig);
    const processor = new Enumerate(job);
    return processor;
}
