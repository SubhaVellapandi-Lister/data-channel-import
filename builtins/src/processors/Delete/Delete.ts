import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IJobFindCriteria,
    Job
} from "@data-channels/dcSDK";

import { parseDate } from "../../utils";

import { IDeleteConfig, IDeleteResult, IJobDeleteConfig, IJobDeleteCriteria, IJobsResult } from "./Delete.interface";

export class Delete extends BaseProcessor {
    private config: IDeleteConfig = {};
    private result: IDeleteResult = {};

    private async terminalError(errorMessage: string): Promise<void> {
        await this.job.terminalError('Delete', errorMessage);
    }

    public async delete(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        const conf = await this.validateDeleteConfig(input);
        if (conf === undefined) {
            return { results: this.result };
        }

        this.config = conf;

        if (this.config.jobs) {
            const deleteResult = await this.findAndDeleteJobs(this.config.jobs!);
            if (deleteResult !== undefined) {
                this.result.jobs = deleteResult;
            }
        }

        return { results: this.result };
    }

    private async validateDeleteConfig(input: IFileProcessorInput): Promise<IDeleteConfig | undefined> {
        let config: IDeleteConfig | undefined;
        try {
            config = input.parameters!['deleteConfig'] as IDeleteConfig;
        } catch {
            await this.terminalError(`DeleteConfig is required`);
        }

        if (config === undefined || Object.keys(config!).length === 0) {
            await this.terminalError(`DeleteConfig cannot be empty`);
        }

        return config;
    }

    private async parseJobDeleteCriteria(jobDeleteCriteria: IJobDeleteCriteria): Promise<IJobFindCriteria | undefined> {
        const jobFindCriteria: IJobFindCriteria = {};

        if (jobDeleteCriteria.expiryDate) {
            const val = parseDate(jobDeleteCriteria.expiryDate.value);
            if (val === null) {
                await this.terminalError(`Invalid expiry date provided`);
                return;
            }

            jobFindCriteria.expiryDate = {
                operator: jobDeleteCriteria.expiryDate.operator,
                value: val!
            };
        }

        return jobFindCriteria;
    }

    private async findAndDeleteJobs(jobDeleteConfig: IJobDeleteConfig): Promise<IJobsResult | undefined> {
        if (jobDeleteConfig.criteria === undefined || Object.keys(jobDeleteConfig.criteria).length === 0) return;
        const findCriteria = await this.parseJobDeleteCriteria(jobDeleteConfig.criteria!);
        if (findCriteria === undefined) return;

        const hardDelete = jobDeleteConfig.hardDelete ?? false;
        const forceDelete = jobDeleteConfig.forceDelete ?? false;

        const pageSize = 50;
        const jobsResult: IJobsResult = { total: 0, deleted: 0 };
        const jobsPager = Job.find({ findCriteria, pageSize: pageSize });

        jobsResult.total = await jobsPager.total();
        console.log(`Total Jobs found: ${jobsResult.total}`);
        if (jobsResult.total > 0) {
            const pages = Math.ceil(jobsResult.total / pageSize);
            //let jobPromises: Promise<Job>[] = [];
            for (let thisPage = 1 ; thisPage <= pages; thisPage++) {
                const slimJobs = (await jobsPager.page(thisPage)).filter(slimJob => slimJob !== null);
                for (const slimJob of slimJobs) {
                    const job = await slimJob.delete(hardDelete, forceDelete);
                    if (job) jobsResult.deleted += 1;
                    console.log(`
                        Deleting job with guid: ${slimJob.guid},
                        Delete Result: ${job !== undefined}
                    `);
                }
            }
        }

        return jobsResult;
    }
}
