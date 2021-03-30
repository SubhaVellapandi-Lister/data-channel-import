import mockAWS from 'aws-sdk';

import {
    getSESProcessor,
    simpleInfoEmailInput,
    emailConfigFailOnly,
    emailConfigSuccessOnly,
    emailConfigWithFilter,
    emailConfigWithTemplate,
    emailConfigEmptyTo,
    startedJobConfig,
    failedJobConfig
} from "./SESTestData";

jest.mock('aws-sdk', () => {
    const mSES = {
        sendEmail: jest.fn().mockImplementation((params, callback) => {
            callback(null, params);
        }),
        promise: jest.fn()
    };
    return {
        SES: jest.fn(() => mSES)
    };
});

describe("SESProcessor", () => {
    test("test for simple email info", async () => {
        const mSES = new mockAWS.SES();
        const sesProcessor = getSESProcessor(startedJobConfig);
        await sesProcessor.emailJobInfo(simpleInfoEmailInput);

        expect(sesProcessor.Config.to).toEqual(["test@receiver.com"]);
        expect(mSES.sendEmail).toHaveBeenCalled();
    });

    test("test for simple email", async () => {
        const mSES = new mockAWS.SES();
        const sesProcessor = getSESProcessor(startedJobConfig);
        await sesProcessor.email(simpleInfoEmailInput);

        expect(sesProcessor.Config.to).toEqual(["test@receiver.com"]);
        expect(mSES.sendEmail).toHaveBeenCalled();
    });

    test("test for email with success only", async () => {
        const sesProcessor = getSESProcessor(failedJobConfig);
        const result = await sesProcessor.email(emailConfigSuccessOnly);

        expect(result).toEqual({ results: { sent: false } });
    });

    test("test for email with fail only", async () => {
        const sesProcessor = getSESProcessor(startedJobConfig);
        const result = await sesProcessor.email(emailConfigFailOnly);

        expect(result).toEqual({ results: { sent: false } });
    });

    test("test for email with custom template", async () => {
        const sesProcessor = getSESProcessor(startedJobConfig);
        const result = await sesProcessor.email(emailConfigWithTemplate);

        expect(result).toEqual({
            results: {
                sent: true,
                addresses: ["test@receiver.com"]
            }
        });
    });

    test("test for email with send filter", async () => {
        const sesProcessor = getSESProcessor(startedJobConfig);
        const result = await sesProcessor.email(emailConfigWithFilter);

        expect(result).toEqual({ results: { sent: false, sendStatus: "sendFilter not met" } });
    });

    test("test for email with empty to array", async () => {
        const sesProcessor = getSESProcessor(startedJobConfig);
        const result = await sesProcessor.email(emailConfigEmptyTo);

        expect(result).toEqual({ results: { sent: false } });
    });
});
