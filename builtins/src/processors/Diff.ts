import * as crypto from 'crypto';
import { Readable } from "stream";

import {
    BaseProcessor, IJobPageOptions,
    IRowProcessorInput,
    IRowProcessorOutput, IStepAfterInput, IStepAfterOutput,
    IStepBeforeInput,
    Job, JobStatus, OutputStreams,
    SlimJob
} from "@data-channels/dcSDK";
import parse from "csv-parse";
import fetch from 'node-fetch';

export enum DiffModifiedOutputType {
    /**
     * Output all values from the current file
     */
    NewRowAll = 'newAll',

    /**
     * Only changed values are kept, others are replaced with [[IDiffModifiedSettings.unmodifiedValue]] or DDNC
     */
    NewRowChangedOnly = 'newChangedOnly',

    /**
     * Outputs all values from the previous file
     */
    OldRowAll = 'oldAll',

    /**
     * Like [[NewRowChangedOnly]], but outputs old values
     */
    OldRowChanged = 'oldChangedOnly'
}

/**
 * Settings for the diff processor's modified output
 */
export interface IDiffModifiedSettings {
    /**
     * Controls what is output.
     */
    outputFormat?: DiffModifiedOutputType;

    /**
     * The sentinel value for unmodified values. Default "DDNC"
     */
    unmodifiedValue?: string;
}

/**
 * Parameters for a single file-diff
 */
export interface IFileDiffConfig {
    /**
     * Columns that should be used to determine the uniqueness of a row
     */
    primaryKeyColumns: string[];

    /**
     * Settings for the modified output
     */
    modifiedOutput?: IDiffModifiedSettings;
}

/**
 * Each file's settings
 */
export interface IDiffParameters {
    [filename: string]: IFileDiffConfig;
}

/**
 * The Diff processor looks at a previous job run and outputs four files for each input,
 * named: {filename}Added/Modified/Deleted/Unmodified.
 *
 * Previous jobs are determined by these criteria:
 *
 * 1. Previous jobs must be Completed
 * 2. Previous jobs must have the same name and product.
 * 3. Previous jobs must have the same ingress or channel config
 * 4. Previous jobs must have the same tenant or both have no tenant
 *
 * Each input file must have a corresponding [[IFileDiffConfig]] specified in parameters.
 *
 * Example diff step:
 *
 * ```json
 * "diff": {
 *           "inputs": [
 *               "testInput"
 *           ],
 *           "method": "diff",
 *           "outputs": [
 *               "testInputAdded",
 *               "testInputModified->changes",
 *               "testInputDeleted",
 *               "testInputUnmodified"
 *           ],
 *           "processor": "data-channels-BuiltInProcessor",
 *           "parameters": {
 *               "testInput": {
 *                   "primaryKeyColumns": [
 *                       "id"
 *                   ],
 *                   "modifiedOutput":  {
 *                   	"outputFormat": "newChangedOnly",
 *                   	"unchangedValue": ""
 *                   }
 *               }
 *           },
 *           "granularity": "row"
 *       }
 * ```
 */
export class Diff extends BaseProcessor {
    private headers!: string[];
    private lastJob!: Job;
    private hashers: { [filename: string]: FileHasher } = {};

    public async before_diff(input: IStepBeforeInput): Promise<void> {
        const findCriteria: IJobPageOptions['findCriteria'] = {
            status: {
                value: JobStatus.Completed
            },
            name: {
                value: this.job.name
            },
            channel: {
                value: {
                    guid: this.job.channel.guid
                }
            }
        };

        if (this.job.product != null) {
            findCriteria.product = {
                value: this.job.product
            };
        }

        if (this.job.tenant) {
            findCriteria.tenant = {
                value: {
                    guid: this.job.tenant.guid
                }
            };
        }

        if (this.job.ingress) {
            findCriteria.ingress = {
                value: {
                    guid: this.job.ingress.guid
                }
            };
        }

        // Find last job to run
        const jobs: SlimJob[] = await Job.find({ findCriteria }).page(1);
        for (const job of jobs) {
            if (
                job.created > this.job.created ||
                job.guid === this.job.guid ||
                // Make sure we don't use another tenant
                job.tenantRef?.guid !== this.job.tenant?.guid
            ) {
                continue;
            }

            this.lastJob = await job.toJob(true);
            break;
        }

        if (this.lastJob == null) {
            return;
        }

        try {
            await this.lastJob.initChannel();
        } catch (error) {
            console.log('Error initializing last job');
            console.log(error);

            return;
        }

        await this.hashPreviousFiles(input);
    }

    public async diff(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            this.headers = input.raw;

            return {
                outputs: {
                    [`${input.name}Added`]: input.raw,
                    [`${input.name}Modified`]: input.raw,
                    [`${input.name}Deleted`]: input.raw,
                    [`${input.name}Unmodified`]: input.raw,
                }
            };
        }

        if (this.lastJob == null || !(input.name in this.hashers)) {
            return {
                outputs: {
                    [`${input.name}Added`]: input.raw,
                }
            };
        }

        const hasher = this.hashers[input.name];

        hasher.newHeaders = this.headers;

        const [res, rowOut] = hasher.testRow(input.raw);

        switch (res) {
        case FileHashResult.Modified:
            return {
                outputs: {
                    [`${input.name}Modified`]: rowOut,
                }
            };
        case FileHashResult.NotPresent:
            return {
                outputs: {
                    [`${input.name}Added`]: rowOut,
                }
            };
        case FileHashResult.Unmodified:
            return {
                outputs: {
                    [`${input.name}Unmodified`]: rowOut,
                }
            };
        }
    }

    public async after_diff(input: IStepAfterInput): Promise<IStepAfterOutput> {
        for (const filename in this.hashers) {
            if (!Object.prototype.hasOwnProperty.call(this.hashers, filename) || !(`${filename}Deleted` in input.outputs)) {
                continue;
            }

            const hasher = this.hashers[filename];
            const outStream = input.outputs[`${filename}Deleted`].writeStream;

            for (const row of hasher.deletedRows) {
                OutputStreams.writeOutputRow(outStream, row);
            }
        }

        return {
            results: {}
        };
    }

    private async hashPreviousFiles(input: IStepBeforeInput): Promise<void> {
        if (input.parameters == null) {
            throw new Error('Diff config missing');
        }

        for (const filename in input.parameters as IDiffParameters) {
            if (!Object.prototype.hasOwnProperty.call(input.parameters, filename)) {
                continue;
            }

            const url = this.findURLForFile(filename);

            if (url == null) {
                console.warn(`Could not find url for ${filename}`);

                // Possible new file
                continue;
            }

            const hasher = new FileHasher(filename, input.parameters[filename], url);

            try {
                await hasher.hashFile();
            } catch (err) {
                console.log(`Error hashing previous file for ${filename}. Will be treated as a new file`);
                console.log(err);

                continue;
            }

            this.hashers[filename] = hasher;
        }
    }

    private findURLForFile(filename: string): string | undefined {
        // check filesIn/filesOut before digging into steps
        for (const file of [...this.lastJob.filesIn, ...this.lastJob.filesOut]) {
            if (file.name === filename && file.s3?.events?.length === 1 && file.s3.events[0].downloadURL != null) {
                return file.s3.events[0].downloadURL;
            }
        }

        // Check all fileUrls to check step outputs
        for (const step of this.lastJob.flow) {
            const stepDetails = this.lastJob.steps[step];

            if (stepDetails == null || stepDetails.fileDownloadUrls == null) {
                continue;
            }

            for (const fileKey in stepDetails.fileDownloadUrls) {
                const [job, jobGuid, ...file] = fileKey.split('/');

                if (!file.join().includes(`${filename}.output`)) {
                    continue;
                }

                return stepDetails.fileDownloadUrls[fileKey];
            }
        }

        return undefined;
    }
}

enum FileHashResult {
    Modified = 'modified',
    Unmodified = 'unmodified',
    NotPresent = 'notPresent'
}

class FileHasher {
    private headers!: string[];
    private rows = new Map<string, string>();
    private pkIdxs: number[] = [];
    private unattestedKeys = new Map<string, string[]>();

    // Used for tracking between old and new
    private newPkIdxs: number[] = [];
    private oldHeaderIdxs!: number[]; // Locations of headers from old file in the new file

    constructor(
        public filename: string,
        public config: IFileDiffConfig,
        public url: string
    ) {

    }

    /**
     * Sets the headers for the new file. This must be called before testing rows on a new file
     *
     * @param newHeaders
     */
    set newHeaders(newHeaders: string[]) {
        // Only compute once per instance
        if (this.oldHeaderIdxs != null) {
            return;
        }

        this.oldHeaderIdxs = newHeaders
            .map((header) => this.headers.indexOf(header))
            .filter((idx) => idx !== -1);

        for (const pk of this.config.primaryKeyColumns) {
            const pkIdx = newHeaders.indexOf(pk);

            if (pkIdx === -1) {
                throw new Error(`Missing primary key ${pk} in new file`);
            }

            this.newPkIdxs.push(pkIdx);
        }
    }

    get deletedRows(): string[][] {
        return [...this.unattestedKeys.values()];
    }

    /**
     * Test a new file row against the old file
     *
     * @param raw
     */
    testRow(raw: string[]): [FileHashResult, string[]] {
        const [pkHash, rowHash] = this.hashRow(raw, true);
        const oldRaw = this.unattestedKeys.get(pkHash);

        this.unattestedKeys.delete(pkHash);

        const oldRow = this.rows.get(pkHash);

        if (oldRow == null) {
            return [FileHashResult.NotPresent, raw];
        } else if (oldRow !== rowHash) {
            return [FileHashResult.Modified, this.getModifiedOutput(raw, oldRaw!)];
        } else {
            return [FileHashResult.Unmodified, raw];
        }
    }

    private getModifiedOutput(currentRaw: string[], oldRaw: string[]): string[] {
        const { outputFormat } = this.config.modifiedOutput ?? { outputFormat: DiffModifiedOutputType.NewRowAll };

        switch (outputFormat) {
        case DiffModifiedOutputType.NewRowChangedOnly:
            return this.getChangedOnlyOutput(currentRaw, oldRaw, false);
        case DiffModifiedOutputType.OldRowAll:
            return this.oldHeaderIdxs.map((idx) => oldRaw[idx]);
        case DiffModifiedOutputType.OldRowChanged:
            return this.getChangedOnlyOutput(currentRaw, oldRaw, true);
        case DiffModifiedOutputType.NewRowAll:
        default:
            return currentRaw;
        }
    }

    private getChangedOnlyOutput(currentRaw: string[], oldRaw: string[], useOld: boolean): string[] {
        const { unmodifiedValue } = this.config.modifiedOutput ?? {};
        const ret = [];

        for (let i = 0; i < currentRaw.length; i++) {
            // Always include primary keys in output
            if (this.newPkIdxs.indexOf(i) !== -1) {
                ret.push(currentRaw[i]);

                continue;
            }

            const newVal = currentRaw[i];
            const oldVal = oldRaw[this.oldHeaderIdxs[i]];
            const retVal = useOld ? oldVal : newVal;

            ret.push(newVal === oldVal ? unmodifiedValue ?? 'DDNC' : retVal);
        }

        return ret;
    }

    private hashRow(raw: string[], hashNew: boolean = false): [string, string] {
        // md5 since security isn't important here
        const pkHasher = crypto.createHash('md5');
        const rowHasher = crypto.createHash('md5');
        const idxs = hashNew ? this.newPkIdxs : this.pkIdxs;

        for (const pkIdx of idxs) {
            pkHasher.update(raw[pkIdx]);
        }

        for (const val of raw) {
            rowHasher.update(val);
        }

        return [pkHasher.digest('hex'), rowHasher.digest('hex')];
    }

    async hashFile(): Promise<void> {
        const request = await fetch(this.url);
        const read = Readable.from(await request.buffer());
        const parser = parse({
            bom: true,
            relax_column_count: true,
            skip_empty_lines: true,
            skip_lines_with_empty_values: true
        });

        await new Promise((resolve, reject) => {
            let index = 1;
            let isReading = false;
            let isEnded = false;

            parser.on('readable', async () => {
                if (isReading) {
                    return;
                }

                isReading = true;

                try {
                    let record = parser.read();

                    while (record) {
                        const raw = record as string[];

                        if (index === 1) {
                            this.headers = raw;

                            // Handle header row
                            for (const pk of this.config.primaryKeyColumns) {
                                const pkIdx = raw.indexOf(pk);

                                if (pkIdx === -1) {
                                    reject(`Missing primary key ${pk}`);
                                }

                                this.pkIdxs.push(pkIdx);
                            }

                            index += 1;
                            record = parser.read();
                            continue;
                        }

                        const [pkHash, rowHash] = this.hashRow(raw);

                        this.unattestedKeys.set(pkHash, raw);
                        this.rows.set(pkHash, rowHash);

                        record = parser.read();
                        index += 1;
                    }
                } catch (err) {
                    reject(err);

                    return;
                }

                isReading = false;

                if (isEnded) {
                    // if we've already received an 'end' notification then just resolve the promise
                    resolve();
                }
            });

            parser.on('end', () => {
                isEnded = true;

                if (!isReading) {
                    setTimeout(() => resolve(), 10);
                }
            });

            parser.on('close', () => {
                // do nothing for now, might need to use in the future, who knows
            });

            parser.on('error', (err) => {
                console.log(`CSV Read Error ${err}`);
                reject(err);
            });

            parser.on('skip', (err) => {
                console.log(`CSV Row Skipped ${err}`);
            });

            read.pipe(parser);
        });
    }
}
