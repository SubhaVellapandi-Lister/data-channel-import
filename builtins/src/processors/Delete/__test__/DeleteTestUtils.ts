import { ConfigType, IFileProcessorInput, JobStatus, jobWithInlineChannel } from '@data-channels/dcSDK';
import _ from 'lodash';

import { Delete } from '../Delete';
import { IDeleteConfig } from '../Delete.interface';

export const testDeleteConfig: IDeleteConfig = {
    jobs: {
        criteria: {
            expiryDate: {
                operator: "=",
                value: "today"
            }
        }
    }
};

export const testEmptyJobsDeleteConfig: IDeleteConfig = {
    jobs: {
        criteria: {}
    }
};

export const testDeleteInputWithUndefinedParameters: IFileProcessorInput = {
    inputs: {},
    outputs: {}
};

export const testDeleteInputWithEmptyJobDeleteCriteria: IFileProcessorInput = {
    inputs: {},
    outputs: {},
    parameters: {
        deleteConfig: _.cloneDeep(testEmptyJobsDeleteConfig)
    }
};

export const testDeleteInput: IFileProcessorInput = {
    inputs: {},
    outputs: {},
    parameters: {
        deleteConfig: _.cloneDeep(testDeleteConfig)
    }
};

export const testJobConfig = {
    guid: "some-guid",
    created: new Date(),
    name: "some-job",
    isDeleted: false,
    currentStep: "delete",
    flow: ["delete", "dummyNextStep"],
    status: JobStatus.Started,
    statusMsg: "",
    filesIn: [],
    filesOut: [],
    steps: {
        delete: {
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
    flow: ["delete"],
    steps: {
        delete: {
            method: "delete",
            processor: "some-processor-name",
            parameters: {
                deleteConfig: _.cloneDeep(testDeleteConfig)
            },
            granularity: "once"
        }
    },
    systemFailureRetries: 1,
    inheritOnly: false
};

export function getDeleteProcessor(): Delete {
    const job = jobWithInlineChannel(testJobConfig, testChannelConfig);
    const deleteProcessor = new Delete(job);
    return deleteProcessor;
}
