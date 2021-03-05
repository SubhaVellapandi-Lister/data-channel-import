import { Job, JobPager, SlimJob } from "@data-channels/dcSDK";
import _ from "lodash";

import { IDeleteConfig } from "../Delete.interface";

import { getDeleteProcessor, testDeleteInput, testDeleteInputWithEmptyJobDeleteCriteria, testDeleteInputWithUndefinedParameters, testEmptyJobsDeleteConfig } from "./DeleteTestUtils";

describe("DeleteProcessor", () => {
    afterAll(() => {
        jest.restoreAllMocks();
    });

    test("delete with empty parameters", async () => {
        const deleteProcessor = getDeleteProcessor();
        const spy = jest.spyOn(deleteProcessor.job, 'terminalError').mockReturnValue(new Promise(resolve => resolve()));
        const output = await deleteProcessor.delete(testDeleteInputWithUndefinedParameters);

        expect(output).toEqual({ results: {} });
        expect(spy).toHaveBeenCalledWith('Delete', 'DeleteConfig is required');
    });

    test("delete without deleteConfig", async () => {
        const deleteProcessor = getDeleteProcessor();
        const spy = jest.spyOn(deleteProcessor.job, 'terminalError').mockReturnValue(new Promise(resolve => resolve()));
        const output = await deleteProcessor.delete({ ...testDeleteInputWithUndefinedParameters, parameters: {} });

        expect(output).toEqual({ results: {} });
        expect(spy).toHaveBeenCalledWith('Delete', 'DeleteConfig cannot be empty');
    });

    test("delete job with empty criteria", async () => {
        const deleteProcessor = getDeleteProcessor();
        const output = await deleteProcessor.delete(testDeleteInputWithEmptyJobDeleteCriteria);

        expect(output).toEqual({ results: {} });
    });

    test("delete job with invlid criteria (invalid expiry date)", async () => {
        const deleteProcessor = getDeleteProcessor();
        const input = _.cloneDeep(testDeleteInput);
        (input.parameters!['deleteConfig'] as IDeleteConfig).jobs!.criteria!.expiryDate!.value = 'Invalid Date String';
        const spy = jest.spyOn(deleteProcessor.job, 'terminalError').mockReturnValue(new Promise(resolve => resolve()));
        const output = await deleteProcessor.delete(input);

        expect(output).toEqual({ results: {} });
        expect(spy).toHaveBeenCalledWith('Delete', 'Invalid expiry date provided');
    });

    test("delete job with valid criteria and hard delete set to true", async () => {
        const deleteProcessor = getDeleteProcessor();
        const input = _.cloneDeep(testDeleteInput);
        const deleteConfig = (input.parameters!['deleteConfig'] as IDeleteConfig);
        deleteConfig.jobs!.criteria!.expiryDate!.value = 'today';
        deleteConfig.jobs!.hardDelete = true;

        const deleteSpy = jest.spyOn(SlimJob.prototype, 'delete')
            .mockReturnValue(new Promise(resolve => resolve(getDeleteProcessor().job)));
        const totalSpy = jest.spyOn(JobPager.prototype, 'total')
            .mockReturnValue(new Promise(resolve => resolve(1)));
        const pageSpy = jest.spyOn(JobPager.prototype, 'page')
            .mockReturnValue(new Promise(resolve => resolve([SlimJob.fromCore(getDeleteProcessor().job.rawConfig)])));
        const findSpy = jest.spyOn(Job, 'find').mockReturnValue(new JobPager({ findCriteria: {} }));

        const output = await deleteProcessor.delete(input);

        expect(output).toEqual({ results: { jobs: { total: 1, deleted: 1 } } });
        expect(deleteSpy).toHaveBeenCalledWith(true, false);
        expect(totalSpy).toHaveBeenCalled();
        expect(pageSpy).toHaveReturned();
        expect(findSpy).toHaveBeenCalled();
    });

    test("delete job with valid criteria and force delete set to true", async () => {
        const deleteProcessor = getDeleteProcessor();
        const input = _.cloneDeep(testDeleteInput);
        const deleteConfig = (input.parameters!['deleteConfig'] as IDeleteConfig);
        deleteConfig.jobs!.criteria!.expiryDate!.value = 'today';
        deleteConfig.jobs!.forceDelete = true;

        const deleteSpy = jest.spyOn(SlimJob.prototype, 'delete')
            .mockReturnValue(new Promise(resolve => resolve(getDeleteProcessor().job)));
        const totalSpy = jest.spyOn(JobPager.prototype, 'total')
            .mockReturnValue(new Promise(resolve => resolve(1)));
        const pageSpy = jest.spyOn(JobPager.prototype, 'page')
            .mockReturnValue(new Promise(resolve => resolve([SlimJob.fromCore(getDeleteProcessor().job.rawConfig)])));
        const findSpy = jest.spyOn(Job, 'find').mockReturnValue(new JobPager({ findCriteria: {} }));

        const output = await deleteProcessor.delete(input);

        expect(output).toEqual({ results: { jobs: { total: 1, deleted: 1 } } });
        expect(deleteSpy).toHaveBeenCalledWith(false, true);
        expect(totalSpy).toHaveBeenCalled();
        expect(pageSpy).toHaveReturned();
        expect(findSpy).toHaveBeenCalled();
    });
});
