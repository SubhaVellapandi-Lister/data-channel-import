import { ChannelConfig, IRowProcessorInput, IStepBeforeInput, JobStatus, OutputStreams } from "@data-channels/dcSDK";
import { Cloud9 } from "aws-sdk";
import "jest";
import _, { head } from "lodash";

import {
    currentStepEmptyJobConfig,
    fileTranslateConfigWithHeaderMappings,
    fileTranslateConfigWithIndexMappings,
    fileTranslateConfigWithValueMappings,
    getTranslateProcessor,
    previousStepJobConfig,
    testChannelConfig,
    testInputDataRow,
    testInputDataRowWithMultipleFileConfigInParameters,
    testInputHeadersRow,
    testInputHeadersRowWithMultipleFileConfigInParameters,
    testTranslateConfig,
    testTranslateMultipleFileConfig
} from "./TranslateTestUtils";

describe("TranslateProcessor", () => {
    beforeAll(() => {
        jest.spyOn(ChannelConfig.prototype, 'update').mockImplementation(async () => true);
        jest.spyOn(OutputStreams.prototype, 'writeOutputValues').mockImplementation(() => { return; });
        ChannelConfig.getConfig = jest.fn().mockReturnValue(ChannelConfig.fromIChannelConfig(testChannelConfig));
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    test("test for before_translate", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateConfig);
        expect(translateProcessor.CurrentStep).toBe("Translate");
        expect(translateProcessor.NextStep).toBe("dummyNextStep");
        expect(translateProcessor.DynamicInput).toBeTruthy();
        expect(translateProcessor.DynamicOutput).toBeTruthy();
        expect(translateProcessor.MultipleFileConfig).toBeFalsy();
    });

    test("test for job with previous step", async () => {
        const translateProcessor = getTranslateProcessor(previousStepJobConfig);
        await translateProcessor.before_translate(testTranslateConfig);
        expect(translateProcessor.PreviousStep).toEqual("previous-step");
        expect(translateProcessor.JobOutFileExtension).toEqual("Previous-stepd.output");
    });

    test("test for job with current step empty", async () => {
        const translateProcessor = getTranslateProcessor(currentStepEmptyJobConfig);
        await translateProcessor.before_translate(testTranslateConfig);
        expect(translateProcessor.CurrentStep).toEqual("");
    });

    test("before_translate with multipleFileConfig set to true but empty fileTranslateConfig", async () => {
        const translateProcessor = getTranslateProcessor();

        const invalidTranslateConfig = _.cloneDeep(testTranslateMultipleFileConfig) as IStepBeforeInput;
        invalidTranslateConfig.parameters!["fileTranslateConfig"] = {};

        await expect(() => translateProcessor.before_translate(invalidTranslateConfig))
            .rejects
            .toThrowError('Missing fileTranslateConfig in Translate-Builtin');
    });

    test("before_translate with empty translateConfig", async () => {
        const translateProcessor = getTranslateProcessor();

        const invalidTranslateConfig = _.cloneDeep(testTranslateConfig) as IStepBeforeInput;
        invalidTranslateConfig.parameters!["translateConfig"] = undefined;

        await expect(() => translateProcessor.before_translate(invalidTranslateConfig))
            .rejects
            .toThrowError('Missing translateConfig in Translate-Builtin');
    });

    test("translate", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateConfig);
        const headersOuput = await translateProcessor.translate(testInputHeadersRow);
        const dataOutput = await translateProcessor.translate(testInputDataRow);

        expect(headersOuput).toEqual({
            index: 1,
            outputs: {
                i1Translated: testInputHeadersRow.raw
            }
        });

        expect(dataOutput).toEqual({
            index: 2,
            outputs: {
                i1Translated: testInputDataRow.raw
            }
        });
    });

    test("translate with empty translateConfig in parameters", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateConfig);

        const invalidHeaderRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;
        invalidHeaderRow.parameters!["translateConfig"] = undefined;

        await expect(() => translateProcessor.translate(invalidHeaderRow))
            .rejects
            .toThrowError('Missing translateConfig in Translate-Builtin');
    });

    test("translate with multipleFileConfig", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateMultipleFileConfig);
        const headersOutput = await translateProcessor.translate(testInputHeadersRowWithMultipleFileConfigInParameters);
        const dataOutput = await translateProcessor.translate(testInputDataRowWithMultipleFileConfigInParameters);

        expect(headersOutput).toEqual({
            index: 1,
            outputs: {
                i1Translated: testInputHeadersRowWithMultipleFileConfigInParameters.raw
            }
        });

        expect(dataOutput).toEqual({
            index: 2,
            outputs: {
                i1Translated: testInputDataRowWithMultipleFileConfigInParameters.raw
            }
        });
    });

    test("translate with invalid multipleFileConfig in parameters", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateMultipleFileConfig);

        const invalidHeaderRow = _.cloneDeep(testInputHeadersRowWithMultipleFileConfigInParameters) as IRowProcessorInput;
        invalidHeaderRow.parameters!["fileTranslateConfig"][testInputHeadersRowWithMultipleFileConfigInParameters.name] = undefined;

        await expect(() => translateProcessor.translate(invalidHeaderRow))
            .rejects
            .toThrowError(`Failed to validate translate processor missing input file named ${testInputHeadersRowWithMultipleFileConfigInParameters.name}.`);
    });

    test("translate with saveIndexMappings set to true", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateConfig);

        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;
        headersRow.parameters!["translateConfig"]["saveIndexMappings"] = true;
        const headersOutput = await translateProcessor.translate(headersRow);

        expect(headersOutput).toEqual({
            index: 1,
            outputs: {
                i1Translated: testInputHeadersRow.raw
            }
        });
    });

    test("translate with headerlessFile option set to true", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateConfig);

        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;
        headersRow.parameters!["translateConfig"]["headerlessFile"] = true;
        const headersOutput = await translateProcessor.translate(headersRow);

        expect(headersOutput).toEqual({
            index: 1,
            outputs: {
                i1Translated: testInputHeadersRow.raw
            }
        });
    });

    test("translate with headerlessFile option set to true and no headers row", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateConfig);

        const dataRow = _.cloneDeep(testInputDataRow) as IRowProcessorInput;
        dataRow.parameters!["translateConfig"]["headerlessFile"] = true;
        dataRow.index = 1;
        const headersOutput = await translateProcessor.translate(dataRow);

        expect(headersOutput).toEqual({
            index: 1,
            outputs: {
                i1Translated: dataRow.raw
            }
        });
    });

    test("translate with headerlessFile option set to true but empty indexMappings", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateConfig);

        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;
        headersRow.parameters!["translateConfig"] = fileTranslateConfigWithHeaderMappings;
        headersRow.parameters!["translateConfig"]["headerlessFile"] = true;

        await expect(() => translateProcessor.translate(headersRow))
            .rejects
            .toThrowError('Headerless files must have indexMappings');
    });

    test("translate with headerlessFile option set to true but empty headers", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateConfig);

        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;
        headersRow.raw = [];
        headersRow.parameters!["translateConfig"]["headerlessFile"] = true;

        await expect(() => translateProcessor.translate(headersRow))
            .rejects
            .toThrowError('Headerless column length does not match mapping. Be sure indexMapping accounts for all columns');
    });
    test("translate with headerlessFile option set to true and some invalid headers", async () => {
        const translateProcessor = getTranslateProcessor();
        await translateProcessor.before_translate(testTranslateConfig);

        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;
        // Appending some dummy string for half of the headers in the array to make them invalid
        headersRow.raw = headersRow.raw.map((header, index) => index % 2 === 0 ? header : header+"_INVALID");
        headersRow.parameters!["translateConfig"]["headerlessFile"] = true;

        await translateProcessor.translate(headersRow);

        expect(translateProcessor.job.status).toEqual(JobStatus.Failed);
    });

    test("translate with headerMappings in translateConfig", async () => {
        const translateProcessor = getTranslateProcessor();

        const translateConfig = _.cloneDeep(testTranslateConfig) as IStepBeforeInput;
        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;

        translateConfig.parameters!["translateConfig"] = fileTranslateConfigWithHeaderMappings;
        headersRow.parameters!["translateConfig"] = fileTranslateConfigWithHeaderMappings;
        translateConfig.parameters!["translateConfig"]["headerlessFile"] = false;

        await translateProcessor.before_translate(translateConfig);
        const headersOutput = await translateProcessor.translate(headersRow);

        const expectedHeaders = headersRow.raw.map(column => fileTranslateConfigWithHeaderMappings.headerMappings![column] ?? column);

        expect(headersOutput).toEqual({
            index: 1,
            outputs: {
                i1Translated: expectedHeaders
            }
        });
    });

    test('translate headerMappings in translateConfig with removeUnammpedHeaders set to true', async () => {
        const translateProcessor = getTranslateProcessor();

        const translateConfig = _.cloneDeep(testTranslateConfig) as IStepBeforeInput;
        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;

        translateConfig.parameters!["translateConfig"] = fileTranslateConfigWithHeaderMappings;
        headersRow.parameters!["translateConfig"] = fileTranslateConfigWithHeaderMappings;
        headersRow.parameters!["translateConfig"]["removeUnmappedHeaders"] = true;

        await translateProcessor.before_translate(translateConfig);
        const headersOutput = await translateProcessor.translate(headersRow);

        const expectedHeaders = headersRow.raw.map(column => fileTranslateConfigWithHeaderMappings.headerMappings![column] ?? column);

        expect(headersOutput).toEqual({
            index: 1,
            outputs: {
                i1Translated: expectedHeaders
            }
        });
    });

    test("translate indexMappings in translateConfig with removeUnmappedHeaders set to true", async () => {
        const translateProcessor = getTranslateProcessor();

        const translateConfig = _.cloneDeep(testTranslateConfig) as IStepBeforeInput;
        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;

        translateConfig.parameters!["translateConfig"] = fileTranslateConfigWithIndexMappings;
        headersRow.parameters!["translateConfig"] = fileTranslateConfigWithIndexMappings;
        headersRow.parameters!["translateConfig"]["removeUnmappedHeaders"] = true;

        await translateProcessor.before_translate(translateConfig);
        const headersOutput = await translateProcessor.translate(headersRow);

        const expectedHeaders = headersRow.raw.map(column => fileTranslateConfigWithIndexMappings.indexMappings![column] ?? column);

        expect(headersOutput).toEqual({
            index: 1,
            outputs: {
                i1Translated: expectedHeaders
            }
        });
    });

    test("translate with headerMappings and indexMappings in translateConfig without headerlessFile set to true", async () => {
        const translateProcessor = getTranslateProcessor();

        const translateConfig = _.cloneDeep(testTranslateConfig) as IStepBeforeInput;
        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;
        headersRow.parameters!["translateConfig"]["headerMappings"] = fileTranslateConfigWithHeaderMappings.headerMappings;
        translateConfig.parameters!["translateConfig"] = fileTranslateConfigWithHeaderMappings;
        translateConfig.parameters!["translateConfig"]["indexMappings"] = fileTranslateConfigWithIndexMappings;

        await translateProcessor.before_translate(translateConfig);
        const headersOutput = await translateProcessor.translate(headersRow);

        const expectedHeaders = headersRow.raw.map(column => fileTranslateConfigWithHeaderMappings.headerMappings![column] ?? column);

        expect(headersOutput).toEqual({
            index:1,
            outputs: {
                i1Translated: expectedHeaders
            }
        });
    });

    test("translate with headerMappings and indexMappings in translateConfig with headerlessFile set to true", async () => {
        const translateProcessor = getTranslateProcessor();

        const translateConfig = _.cloneDeep(testTranslateConfig) as IStepBeforeInput;
        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;
        headersRow.parameters!["translateConfig"]["headerMappings"] = fileTranslateConfigWithHeaderMappings.headerMappings;
        headersRow.parameters!["translateConfig"]["indexMappings"] = fileTranslateConfigWithIndexMappings.indexMappings;
        headersRow.parameters!["translateConfig"]["headerlessFile"] = true;
        translateConfig.parameters!["translateConfig"] = fileTranslateConfigWithHeaderMappings;
        translateConfig.parameters!["translateConfig"]["indexMappings"] = fileTranslateConfigWithIndexMappings;

        await translateProcessor.before_translate(translateConfig);
        const headersOutput = await translateProcessor.translate(headersRow);

        const expectedHeaders = headersRow.raw.map(column => fileTranslateConfigWithIndexMappings.indexMappings![column] ?? column);

        expect(headersOutput).toEqual({
            index:1,
            outputs: {
                i1Translated: expectedHeaders
            }
        });
    });

    test("translate with valueMappings in translateConfig", async () => {
        const translateProcessor = getTranslateProcessor();

        const translateConfig = _.cloneDeep(testTranslateConfig) as IStepBeforeInput;
        const headersRow = _.cloneDeep(testInputHeadersRow) as IRowProcessorInput;
        const dataRow = _.cloneDeep(testInputDataRow) as IRowProcessorInput;

        translateConfig.parameters!["translateConfig"] = fileTranslateConfigWithValueMappings;
        headersRow.parameters!["translateConfig"] = fileTranslateConfigWithValueMappings;
        dataRow.parameters!["translateConfig"] = fileTranslateConfigWithValueMappings;

        await translateProcessor.before_translate(translateConfig);
        const headersOutput = await translateProcessor.translate(headersRow);
        const dataOutput = await translateProcessor.translate(dataRow);

        const translatedData: string[] = [...testInputDataRow.raw];
        for (const [key, mappings] of Object.entries(fileTranslateConfigWithValueMappings.valueMappings!)) {
            const columnIndex = headersRow.raw.indexOf(key);
            for (const mapping of mappings) {
                if (translatedData[columnIndex] === mapping.fromValue) {
                    translatedData[columnIndex] = mapping.toValue;
                }
            }
        }

        expect(headersOutput).toEqual({
            index: 1,
            outputs: {
                i1Translated: testInputHeadersRow.raw
            }
        });

        expect(dataOutput).toEqual({
            index: 2,
            outputs: {
                i1Translated: translatedData
            }
        });
    });
});
