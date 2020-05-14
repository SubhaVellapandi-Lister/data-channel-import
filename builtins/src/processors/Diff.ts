import {
    BaseProcessor, IJobPageOptions,
    IRowProcessorInput,
    IRowProcessorOutput, IStepAfterInput, IStepAfterOutput,
    IStepBeforeInput,
    Job, JobStatus, OutputStreams,
    SlimJob
} from "@data-channels/dcSDK";
import * as crypto from 'crypto';
import parse from "csv-parse";
import request from 'request-promise-native';
import {Readable} from "stream";

export interface IFileDiffConfig {
    primaryKeyColumns: string[];
}

export interface IDiffParameters {
    [filename: string]: IFileDiffConfig;
}

export default class Diff extends BaseProcessor {
    private lastJob!: Job;
    private hashers: { [filename: string]: FileHasher } = {};

    public async before_diff(input: IStepBeforeInput) {
        console.log('before diff');
        let jobs: SlimJob[];

        const findCriteria: IJobPageOptions['findCriteria'] = {
            status: {
                value: JobStatus.Completed
            }
        };

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
        } else {
            findCriteria.channel = {
                value: {
                    guid: this.job.channel.guid
                }
            };
        }

        // Find last job to run
        jobs = await Job.find({ findCriteria }).page(1);

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

        await this.hashPreviousFiles(input);
    }

    public async diff(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
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
            console.log('no last job or last file diff');

            return {
                outputs: {
                    [`${input.name}Added`]: input.raw,
                }
            };
        }

        const hasher = this.hashers[input.name];

        console.log(`diffing ${input.index} ${input.raw}`);

        const res = hasher.testRow(input.raw);

        console.log(`${input.index} => ${res}`);

        switch (res) {
        case FileHashResult.Modified:
            return {
                outputs: {
                    [`${input.name}Modified`]: input.raw,
                }
            };
        case FileHashResult.NotPresent:
            return {
                outputs: {
                    [`${input.name}Added`]: input.raw,
                }
            };
        case FileHashResult.Unmodified:
            return {
                outputs: {
                    [`${input.name}Unmodified`]: input.raw,
                }
            };
        }
    }

    public async after_diff(input: IStepAfterInput): Promise<IStepAfterOutput> {
        console.log('after diff');

        for (const filename in this.hashers) {
            if (!this.hashers.hasOwnProperty(filename)) {
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

    private async hashPreviousFiles(input: IStepBeforeInput) {
        if (input.parameters == null) {
            throw new Error('Diff config missing');
        }

        for (const filename in input.parameters as IDiffParameters) {
            if (!input.parameters.hasOwnProperty(filename)) {
                continue;
            }

            const url = this.findURLForFile(filename);

            if (url == null) {
                // Possible new file
                continue;
            }

            const hasher = new FileHasher(filename, input.parameters[filename], url);

            await hasher.hashFile();

            this.hashers[filename] = hasher;
        }
    }

    private findURLForFile(filename: string): string | undefined {
        // check filesIn/filesOut before digging into steps
        for (const file of [...this.lastJob.filesIn, ...this.lastJob.filesOut]) {
            if (file.name === filename && file.s3?.downloadURL != null) {
                return file.s3.downloadURL;
            }
        }

        // TODO check steps
        return undefined;
    }
}

enum FileHashResult {
    Modified = 'modified',
    Unmodified = 'unmodified',
    NotPresent = 'notPresent'
}

class FileHasher {
    private rows = new Map<string, string>();
    private pkIdxs: number[] = [];
    private unattestedKeys = new Map<string, string[]>();

    constructor(
        public filename: string,
        public config: IFileDiffConfig,
        public url: string
    ) {

    }

    get deletedRows(): string[][] {
        return [...this.unattestedKeys.values()];
    }

    testRow(raw: string[]): FileHashResult {
        const [pkHash, rowHash] = this.hashRow(raw);

        this.unattestedKeys.delete(pkHash);

        const oldRow = this.rows.get(pkHash);

        if (oldRow == null) {
            return FileHashResult.NotPresent;
        } else if (oldRow !== rowHash) {
            return FileHashResult.Modified;
        } else {
            return FileHashResult.Unmodified;
        }
    }

    private hashRow(raw: string[]): [string, string] {
        // md5 since security isn't important here
        const pkHasher = crypto.createHash('md5');
        const rowHasher = crypto.createHash('md5');

        for (const pkIdx of this.pkIdxs) {
            pkHasher.update(raw[pkIdx]);
        }

        for (const val of raw) {
            rowHasher.update(val);
        }

        return [pkHasher.digest('hex'), rowHasher.digest('hex')];
    }

    async hashFile() {
        const read = Readable.from(await request.get(this.url));
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

                        console.log(`${index}: ${pkHash}`);
                        console.log(`${index}: row hash ${rowHash}`);

                        this.unattestedKeys.set(pkHash, raw);
                        this.rows.set(pkHash, rowHash);

                        record = parser.read();
                        index += 1;
                    }
                } catch (err) {
                    reject(err);

                    return;
                }

                isReading =  false;

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
