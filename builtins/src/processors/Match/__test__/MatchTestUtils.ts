import { ConfigType, IRowProcessorInput, JobStatus, jobWithInlineChannel } from '@data-channels/dcSDK';
import _ from 'lodash';

import { Match } from '../Match';
import { IMatchConfig, MatchColumnDataType } from '../Match.interface';

export const testMatchConfig: IMatchConfig = {
    sourceInputName: 'scores',
    matchItems: [
        {
            lookupInputName: "students",
            lookupTargets: {
                navStudentId: "studentId"
            },
            matchColumns: [
                {
                    dataType: MatchColumnDataType.String,
                    lookupColumnName: "schoolStudentId",
                    sourceColumnName: "studentId"
                }
            ]
        }
    ],
    targetColumnNames: ['studentId']
};

export const testMatchConfigNoDup: IMatchConfig = { ...testMatchConfig, targetMustBeUnique: true };

export const testMatchConfigMultipleItems: IMatchConfig = {
    sourceInputName: 'scores',
    matchItems: [
        {
            lookupInputName: "students",
            lookupTargets: {
                navStudentId: "studentId"
            },
            matchColumns: [
                {
                    dataType: MatchColumnDataType.String,
                    lookupColumnName: "schoolStudentId",
                    sourceColumnName: "studentId"
                }
            ]
        },
        {
            lookupInputName: "students",
            lookupTargets: {
                navStudentId: "studentId"
            },
            matchColumns: [
                {
                    dataType: MatchColumnDataType.String,
                    lookupColumnName: "name",
                    sourceColumnName: "name"
                },
                {
                    dataType: MatchColumnDataType.Date,
                    lookupColumnName: "birthdate",
                    sourceColumnName: "birthdate"
                }
            ]
        }
    ],
    targetColumnNames: ['studentId']
};

export const testMatchConfigNoDupByType: IMatchConfig = { ...testMatchConfigMultipleItems, targetMustBeUniquePerMatchType: true };

export const testJobConfig = {
    guid: "some-guid",
    created: new Date(),
    name: "some-job",
    isDeleted: false,
    currentStep: "match",
    flow: ["match", "dummyNextStep"],
    status: JobStatus.Started,
    statusMsg: "",
    filesIn: [],
    filesOut: [],
    steps: {
        match: {
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
    flow: ["match"],
    steps: {
        match: {
            method: "matchFields",
            processor: "some-processor-name",
            parameters: {
                matchConfig: _.cloneDeep(testMatchConfig)
            },
            granularity: "once"
        }
    },
    systemFailureRetries: 1,
    inheritOnly: false
};

export function getMatchProcessor(): Match {
    const job = jobWithInlineChannel(testJobConfig, testChannelConfig);
    const processor = new Match(job);
    return processor;
}

export function inputRows(name: string, headers: string[], values: string[][]): IRowProcessorInput[] {
    const results: IRowProcessorInput[] = [];

    results.push({
        name,
        index: 1,
        raw: headers,
        data: headers.reduce((acc, val) => {
            acc[val] = val;
            return acc;
        }, {})
    });

    for (const [idx, row] of values.entries()) {
        results.push({
            name,
            index: idx + 2,
            raw: row,
            data: row.reduce((acc, val, idx) => {
                acc[headers[idx]] = val;
                return acc;
            }, {})
        });
    }

    return results;
}
