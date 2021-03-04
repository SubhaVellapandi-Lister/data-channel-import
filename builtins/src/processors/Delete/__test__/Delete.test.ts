import { Job, JobPager, SlimJob } from "@data-channels/dcSDK";

import { getDeleteProcessor } from "./DeleteTestUtils";

describe("DeleteProcessor", () => {
    beforeAll(() => {
        const deleteProcessor = getDeleteProcessor();
        jest.spyOn(SlimJob.prototype, 'delete')
            .mockReturnValue(new Promise(resolve => resolve(getDeleteProcessor().job)));
        jest.spyOn(JobPager.prototype, 'total')
            .mockReturnValue(new Promise(resolve => resolve(1)));
        jest.spyOn(JobPager.prototype, 'page')
            .mockReturnValue(new Promise(resolve => resolve([SlimJob.fromCore(deleteProcessor.job.rawConfig)])));
        Job.find = jest.fn().mockReturnValue(new JobPager({ findCriteria: {} }));
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    test("delete", async () => {
        const deleteProcessor = getDeleteProcessor();

        expect(deleteProcessor).toBeTruthy();
    });
});
