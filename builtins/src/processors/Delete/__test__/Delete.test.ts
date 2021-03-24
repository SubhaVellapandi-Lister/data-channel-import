import { Job, JobPager, SlimJob } from "@data-channels/dcSDK";
import _ from "lodash";

import { IDeleteConfig } from "../Delete.interface";

import { getDeleteProcessor, testDeleteInput, testDeleteInputWithEmptyJobDeleteCriteria, testDeleteInputWithUndefinedParameters } from "./DeleteTestUtils";

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

    test("delete jobs with empty criteria", async () => {
        const deleteProcessor = getDeleteProcessor();
        const output = await deleteProcessor.delete(testDeleteInputWithEmptyJobDeleteCriteria);

        expect(output).toEqual({ results: {} });
    });

    test("delete jobs with invlid criteria (invalid expiry date)", async () => {
        const deleteProcessor = getDeleteProcessor();
        const input = _.cloneDeep(testDeleteInput);
        (input.parameters!['deleteConfig'] as IDeleteConfig).jobs!.criteria!.expiryDate!.value = 'Invalid Date String';
        const spy = jest.spyOn(deleteProcessor.job, 'terminalError').mockReturnValue(new Promise(resolve => resolve()));
        const output = await deleteProcessor.delete(input);

        expect(output).toEqual({ results: {} });
        expect(spy).toHaveBeenCalledWith('Delete', 'Invalid expiry date provided');
    });

    test("delete jobs with invalid maxDeletionsPerJob", async () => {
        const deleteProcessor = getDeleteProcessor();
        const input = _.cloneDeep(testDeleteInput);
        (input.parameters!['deleteConfig'] as IDeleteConfig).jobs!.maxDeletionsPerJob = 0;
        const spy = jest.spyOn(deleteProcessor.job, 'terminalError').mockReturnValue(new Promise(resolve => resolve()));
        const output = await deleteProcessor.delete(input);

        expect(output).toEqual({ results: {} });
        expect(spy).toHaveBeenCalledWith('Delete', 'maxDeletionsPerJob must have a minimum value of 1');
    });

    test("delete jobs with valid criteria and smaller maxDeletionsPerJob than total jobs found", async () => {
        const deleteProcessor = getDeleteProcessor();
        const input = _.cloneDeep(testDeleteInput);
        const deleteConfig = (input.parameters!['deleteConfig'] as IDeleteConfig);
        deleteConfig.jobs!.criteria!.expiryDate!.value = 'today';

        const totalSpy = jest.spyOn(JobPager.prototype, 'total')
            .mockReturnValue(new Promise(resolve => resolve(2)));
        const pageSpy = jest.spyOn(JobPager.prototype, 'page')
            .mockReturnValue(
                new Promise(resolve => resolve([SlimJob.fromCore(getDeleteProcessor().job.rawConfig), SlimJob.fromCore(getDeleteProcessor().job.rawConfig)])));
        const deleteSpy = jest.spyOn(SlimJob.prototype, 'delete')
            .mockReturnValue(new Promise(resolve => resolve(getDeleteProcessor().job)));
        const findSpy = jest.spyOn(Job, 'find').mockReturnValue(new JobPager({ findCriteria: {} }));

        const output = await deleteProcessor.delete(input);

        expect(output).toEqual({ results: { jobs: { total: 2, deleted: 1, error: 0 } } });
        expect(deleteSpy).toHaveBeenCalled();
        expect(totalSpy).toHaveBeenCalled();
        expect(pageSpy).toHaveBeenCalled();
        expect(findSpy).toHaveBeenCalled();
    });

    test("delete jobs with valid criteria and no jobs found", async () => {
        const deleteProcessor = getDeleteProcessor();
        const input = _.cloneDeep(testDeleteInput);
        const deleteConfig = (input.parameters!['deleteConfig'] as IDeleteConfig);
        deleteConfig.jobs!.criteria!.expiryDate!.value = 'today';

        const totalSpy = jest.spyOn(JobPager.prototype, 'total')
            .mockReturnValue(new Promise(resolve => resolve(0)));
        const findSpy = jest.spyOn(Job, 'find').mockReturnValue(new JobPager({ findCriteria: {} }));

        const output = await deleteProcessor.delete(input);

        expect(output).toEqual({ results: { jobs: { total: 0, deleted: 0, error: 0 } } });
        expect(totalSpy).toHaveBeenCalled();
        expect(findSpy).toHaveBeenCalled();
    });

    test("delete jobs with valid criteria and no jobs deleted", async () => {
        const deleteProcessor = getDeleteProcessor();
        const input = _.cloneDeep(testDeleteInput);
        const deleteConfig = (input.parameters!['deleteConfig'] as IDeleteConfig);
        deleteConfig.jobs!.criteria!.expiryDate!.value = 'today';

        const totalSpy = jest.spyOn(JobPager.prototype, 'total')
            .mockReturnValue(new Promise(resolve => resolve(1)));
        const pageSpy = jest.spyOn(JobPager.prototype, 'page')
            .mockReturnValue(new Promise(resolve => resolve([SlimJob.fromCore(getDeleteProcessor().job.rawConfig)])));
        const deleteSpy = jest.spyOn(SlimJob.prototype, 'delete')
            .mockReturnValue(new Promise(resolve => resolve(undefined)));
        const findSpy = jest.spyOn(Job, 'find').mockReturnValue(new JobPager({ findCriteria: {} }));

        const output = await deleteProcessor.delete(input);

        expect(output).toEqual({ results: { jobs: { total: 1, deleted: 0, error: 1 } } });
        expect(deleteSpy).toHaveBeenCalled();
        expect(totalSpy).toHaveBeenCalled();
        expect(pageSpy).toHaveBeenCalled();
        expect(findSpy).toHaveBeenCalled();
    });

    test("delete jobs with valid criteria and hard delete set to true", async () => {
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

        expect(output).toEqual({ results: { jobs: { total: 1, deleted: 1, error: 0 } } });
        expect(deleteSpy).toHaveBeenCalledWith(true, false);
        expect(totalSpy).toHaveBeenCalled();
        expect(pageSpy).toHaveReturned();
        expect(findSpy).toHaveBeenCalled();
    });

    test("delete jobs with valid criteria and force delete set to true", async () => {
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

        expect(output).toEqual({ results: { jobs: { total: 1, deleted: 1, error: 0 } } });
        expect(deleteSpy).toHaveBeenCalledWith(false, true);
        expect(totalSpy).toHaveBeenCalled();
        expect(pageSpy).toHaveReturned();
        expect(findSpy).toHaveBeenCalled();
    });
});
