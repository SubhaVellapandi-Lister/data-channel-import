import mockAWS from 'aws-sdk';

import { getSNSProcessor, snsInputConfig } from "./SNSTestData";

jest.mock('aws-sdk', () => {
    const mSNS = {
        publish: jest.fn().mockImplementationOnce((params, callback) => {
            callback(null, params);
        }).mockImplementationOnce((params, callback) => {
            callback(new Error("this is an error in SNS"), params);
        }),
        promise: jest.fn()
    };
    return {
        SNS: jest.fn(() => mSNS)
    };
});

describe("SNSProcessor", () => {
    test("test for simple notification successful call", async () => {
        const mSNS = new mockAWS.SNS();
        const snsProcessor = getSNSProcessor();
        await snsProcessor.sns(snsInputConfig);
        expect(mSNS.publish).toHaveBeenCalled();
    });

    test("test for simple notification which results in error", async () => {const mSNS = new mockAWS.SNS();
        const snsProcessor = getSNSProcessor();

        try {
            await snsProcessor.sns(snsInputConfig);
            const message = JSON.stringify({
                guid: snsProcessor.job.guid,
                channel: snsProcessor.job.channelReference,
                steps: snsProcessor.job.steps
            }, undefined, 2);

            expect(mSNS.publish).toHaveBeenCalledWith({
                Message: message,
                Subject: `Data Channels Job - ${snsProcessor.job.guid} Finished`,
                TopicArn: "dummy-arn"
            });
        } catch (err) {
            expect(err.message).toBe("this is an error in SNS");
        }
    });
});
