import { jobWithInlineChannel, ConfigType, IChannelConfig, IIInputDetails, IJobConfig, IRowProcessorInput, IStepBeforeInput, Job, JobStatus, ServiceInterfacer } from '@data-channels/dcSDK';
import _ from 'lodash';

import { Translate } from '../Translate';
import { IFileTranslateConfig, ITranslateParameters } from '../Translate.interface';

const fileInfo: IIInputDetails = {
    key: "",
    bucket: ""
};

const testJobConfig = {
    guid: "some-guid",
    created: new Date(),
    name: "some-job",
    isDeleted: false,
    currentStep: "translate",
    flow: ["translate", "dummyNextStep"],
    status: JobStatus.Started,
    statusMsg: "",
    filesIn: [
        {
            s3: { key: "dummy-key/i1.csv", bucket: "dummy-bucket" },
            name: "i1",
        },
    ],
    filesOut: [{ s3: { key: "i1", bucket: "" }, name: "i1" }],
    steps: {
        translate: {
            finished: false,
        },
        dummyNextStep: {
            finished: false
        }
    },
};

export const fileTranslateConfigWithHeaderMappings: IFileTranslateConfig = {
    headerMappings: {
        "Course_Name": "New_Course_Name",
        "Course_ID": "New_Course_ID"
    }
}

export const fileTranslateConfigWithIndexMappings: IFileTranslateConfig = {
    indexMappings: {
        1: "Course_Name",
        2: "Course_ID",
        3: "State_ID",
        4: "Subject_Area",
        5: "Credits",
        6: "GR6",
        7: "GR7",
        8: "GR8",
        9: "GR9",
        10: "GR10",
        11: "GR11",
        12: "GR12",
        13: "Status",
        14: "Description",
        15: "Instructional_Level",
        16: "CTE",
        17: "Prereq_Text"
    }
}

export const fileTranslateConfigWithValueMappings: IFileTranslateConfig = {
    valueMappings: {
        Subject_Area: [
            {
                fromValue: "Some-Subject-Area",
                toValue: "Some-Subject-Area-Translated"
            }
        ],
        CTE: [
            {
                fromValue: "Some-CTE",
                toValue: "Some-CTE-Translated"
            }
        ]
    }
}

const translateParameters: ITranslateParameters = {
    multipleFileConfig: false,
    translateConfig: fileTranslateConfigWithIndexMappings,
    fileTranslateConfig: {},
    dynamicOutput: true,
    dynamicInput: true
};

const translateParametersWithMultipleFileConfig: ITranslateParameters = {
    multipleFileConfig: true,
    translateConfig: {},
    fileTranslateConfig: {
        i1: fileTranslateConfigWithIndexMappings,
        i2: fileTranslateConfigWithValueMappings
    },
    dynamicOutput: true,
    dynamicInput: true
};

export const testTranslateConfig: IStepBeforeInput = {
    parameters: translateParameters
}

export const testTranslateMultipleFileConfig: IStepBeforeInput = {
    parameters: translateParametersWithMultipleFileConfig
}

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
    flow: ["translate"],
    steps: {
        translate: {
            inputs: [
                "i1"
            ],
            method: "translate",
            outputs: [
                "i1Translated"
            ],
            processor: "some-processor-name",
            parameters: {
                translateConfig: fileTranslateConfigWithValueMappings
            },
            granularity: "row"
        }
    },
    systemFailureRetries: 1,
    inheritOnly: false
}

export const testInputHeadersRow: IRowProcessorInput = {
    index: 1,
    name: "i1",
    fileInfo: fileInfo,
    raw: [
        "Course_Name",
        "Course_ID",
        "State_ID",
        "Subject_Area",
        "Credits",
        "GR6",
        "GR7",
        "GR8",
        "GR9",
        "GR10",
        "GR11",
        "GR12",
        "Status",
        "Description",
        "Instructional_Level",
        "CTE",
        "Prereq_Text"
    ],
    data: {
        Course_Name: "Course_Name",
        Course_ID: "Course_ID",
        State_ID: "State_ID",
        Subject_Area: "Subject_Area",
        Credits: "Credits",
        GR6: "GR6",
        GR7: "GR7",
        GR8: "GR8",
        GR9: "GR9",
        GR10: "GR10",
        GR11: "GR11",
        GR12: "GR12",
        Status: "Status",
        Description: "Description",
        Instructional_Level: "Instructional_Level",
        CTE: "CTE",
        Prereq_Text: "Prereq_Text"
    },
    parameters: translateParameters
};

export const testInputDataRow: IRowProcessorInput = {
    index: 2,
    name: "i1",
    fileInfo: fileInfo,
    raw: [
        "Some-Course-Name",
        "Some-Course-ID",
        "Some-State-ID",
        "Some-Subject-Area",
        "Some-Credits",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Some-Status",
        "Some-Description",
        "Some-Instructional-Level",
        "Some-CTE",
        ""
    ],
    data: {
        Course_Name: "Some-Course-Name",
        Course_ID: "Some-Course-ID",
        State_ID: "Some-State-ID",
        Subject_Area: "Some-Subject-Area",
        Credits: "Some-Credits",
        GR6: "",
        GR7: "",
        GR8: "",
        GR9: "",
        GR10: "",
        GR11: "",
        GR12: "",
        Status: "Some-Status",
        Description: "Some-Description",
        Instructional_Level: "Some-Instructional-Level",
        CTE: "",
        Prereq_Text: ""
    },
    json: [
        "Some-Course-Name",
        "Some-Course-ID",
        "Some-State-ID",
        "Some-Subject-Area",
        "Some-Credits",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Some-Status",
        "Some-Description",
        "Some-Instructional-Level",
        "",
        ""
    ],
    parameters: translateParameters
};

const testInputHeadersRowWithMultipleFileConfigInParameters: IRowProcessorInput = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;
testInputHeadersRowWithMultipleFileConfigInParameters.parameters = translateParametersWithMultipleFileConfig;

const testInputDataRowWithMultipleFileConfigInParameters: IRowProcessorInput = _.cloneDeep(testInputDataRow) as IRowProcessorInput;
testInputDataRowWithMultipleFileConfigInParameters.parameters = translateParametersWithMultipleFileConfig;

export {
    testInputHeadersRowWithMultipleFileConfigInParameters,
    testInputDataRowWithMultipleFileConfigInParameters
};

export function getTranslateProcessor(): Translate {
    const job = jobWithInlineChannel(testJobConfig, testChannelConfig);
    const translateProcessor = new Translate(job);
    return translateProcessor;
}
