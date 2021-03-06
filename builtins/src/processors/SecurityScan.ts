import { execFile } from "child_process";
import { createWriteStream, mkdirSync } from "fs";
import { Readable } from "stream";

import {
    BaseProcessor,
    getSSMValue,
    IFileProcessorInput,
    IFileProcessorOutput,
    s3Readable
} from "@data-channels/dcSDK";
import config from "config";
import _ from "lodash";
import fetch from "node-fetch";

import { sleep, urlsForInputNames } from "../utils";

export enum ScanTool {
    SCANII = 'scanii',
    CLAMAV = 'clamav'
}

export interface IScanConfig {
    byInput?: {
        [inputName: string]: {
            failOnFinding: boolean;
        };
    };
    failOnAnyFinding?: boolean;
    scaniiApiKey?: string;
    scanTool?: ScanTool; // defaults to scanii
    stub?: boolean;
}

export interface IFileScanResult {
    rawResults: object;
    hasFindings: boolean;
}

export interface IScanResults {
    [inputName: string]: IFileScanResult[];
}

const SCANII_URL = 'https://api.scanii.com/v2.1/files';

interface IScaniiIdsByName {
    [iname: string]: string[];
}

export class SecurityScan extends BaseProcessor {
    private config: IScanConfig = {
        scaniiApiKey: '',
        scanTool: ScanTool.SCANII
    };
    private findingsStrings: string[] = [];

    public async securityscan(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        if (input.parameters && input.parameters!['scanConfig']) {
            this.config = input.parameters!['scanConfig'] as IScanConfig;
        }

        let results: IScanResults = {};
        // Populating empty data to prevent scan if stub is set to true
        const stub: boolean = JSON.parse(config.get<string>('cdk.securityScan.stub')) || this.config.stub || false;
        if (stub) {
            for (const fileIn of this.job.filesIn) {
                if (!results[fileIn.name]) {
                    results[fileIn.name] = [];
                }

                const noOfFiles = fileIn.s3?.events?.length ?? 1;
                for (let i = 0; i < noOfFiles; i++) {
                    results[fileIn.name].push({
                        hasFindings: false,
                        rawResults: {}
                    });
                }
            }
        }
        else if (this.config.scanTool === ScanTool.SCANII) {
            results = await this.scaniiScan(input);
        } else {
            results = await this.clamAVScan(input);
        }

        let hasSecurityIssues = false;
        let needsToFail: boolean | undefined = false;
        for (const inputName of Object.keys(results)) {
            for (const result of results[inputName]) {
                hasSecurityIssues = hasSecurityIssues || result.hasFindings;
                if (hasSecurityIssues) {
                    needsToFail = needsToFail || this.config.byInput?.[inputName]?.failOnFinding;
                }
            }
        }

        this.job.setMetaValue('securityScanRun', true);
        this.job.setMetaValue('securityScanIssuesFound', hasSecurityIssues);
        this.job.setMetaValue('securityScanFindings', _.uniq(this.findingsStrings).join(','));

        if (hasSecurityIssues && (needsToFail || this.config.failOnAnyFinding) && !stub) {
            await this.job.terminalError('Security-Scan', `Security Issue found with input file`);
        }

        return {
            results: {
                details: results,
                hasSecurityIssues

            }
        };
    }

    /**
     * Main claim AV scanning function.  Attempts to save disk space and therefore does two passes
     * One for the claim AV main definition, and one for the daily.
     * @param input
     */
    private async clamAVScan(input: IFileProcessorInput): Promise<IScanResults> {
        mkdirSync('/tmp/clamav', { recursive: true });
        await this.downloadClamAVDefinition('clamav/bytecode.cvd', `/tmp/clamav/bytecode.cvd`);
        await this.downloadClamAVDefinition('clamav/daily.cvd', '/tmp/clamav/definition.cvd');

        const resultsByInput: IScanResults = {};
        for (const inputName of Object.keys(input.inputs)) {
            for (const file of input.inputs[inputName]) {
                await this.downloadStreamFile(file.readable, '/tmp/testFile');

                const dailyResults = await this.runClamAV();
                resultsByInput[inputName] = [{
                    hasFindings: dailyResults.hasFindings,
                    rawResults: {
                        daily: dailyResults.rawResults
                    }
                }];
            }
        }

        await this.downloadClamAVDefinition('clamav/main.cvd', '/tmp/clamav/definition.cvd');

        for (const inputName of Object.keys(input.inputs)) {
            const refreshedReadables = await this.refreshInputStream(inputName);

            for (let i = 0; i < input.inputs[inputName].length; i++) {
                await this.downloadStreamFile(refreshedReadables[i].readable, '/tmp/testFile');
                const mainResults = await this.runClamAV();
                resultsByInput[inputName][0].hasFindings =
                    resultsByInput[inputName][0].hasFindings ?? mainResults.hasFindings;
                resultsByInput[inputName][0].rawResults['main'] = mainResults.rawResults;
            }
        }

        return resultsByInput;
    }

    private async runClamAV(): Promise<IFileScanResult> {
        const args = ['-a', '-v', '-d', '/tmp/clamav', '/tmp/testFile'];
        let ldpath = process.env.LD_LIBRARY_PATH || '';
        if (ldpath.length) {
            ldpath += ':';
        }
        ldpath += '/var/task/clamav';
        const options = { env: { LD_LIBRARY_PATH: ldpath } };

        return new Promise((resolve, reject) => {
            execFile('./clamav/clamscan', args, options, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        hasFindings: true,
                        rawResults: {
                            error: JSON.stringify(error),
                            stderr,
                            stdout
                        }
                    });
                }

                const hasFindings = stdout.includes('Infected files: 1');

                if (hasFindings) {
                    const findingMatch = (/: (.*?) FOUND/g).exec(stdout);
                    if (findingMatch) {
                        this.findingsStrings.push(findingMatch[1]);
                    }
                }

                resolve({
                    hasFindings,
                    rawResults: {
                        stderr,
                        stdout
                    }
                });
            });
        });
    }

    private async downloadStreamFile(stream: Readable, path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const wstream = stream.pipe(createWriteStream(path));
                wstream.on('finish', () => {
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    private async downloadClamAVDefinition(keyName: string, path: string): Promise<void> {
        const readStream = await s3Readable(this.job.workspace!.bucket, keyName);

        await this.downloadStreamFile(readStream, path);
    }

    private async scaniiScan(input: IFileProcessorInput): Promise<IScanResults> {
        if (!this.config.scaniiApiKey?.length) {
            this.config.scaniiApiKey = await getSSMValue('/data-channels-builtin/scaniiApiKey');
        }
        const idByName = await this.triggerScaniiScans(Object.keys(input.inputs));

        // wait a couple seconds for scans to run before checking status
        await sleep(2000);
        const results = await this.pollScaniiResults(idByName);

        return results;
    }

    public async triggerScaniiScans(inputNames: string[]): Promise<IScaniiIdsByName> {
        const results: IScaniiIdsByName = {};
        const urlsByName = urlsForInputNames(this.job);
        console.log(`scanning files:`, urlsByName);
        for (const inputName of Object.keys(urlsByName)) {
            results[inputName] = [];
            for (const fileUrl of urlsByName[inputName]) {
                const params = new URLSearchParams();
                params.append('location', fileUrl);

                const resp = await fetch(`${SCANII_URL}/fetch`, {
                    headers: { Authorization: `Basic ${this.config.scaniiApiKey}` },
                    method: 'POST',
                    body: params
                });
                if (resp.status < 400) {
                    const body = await resp.json();
                    console.log(`Scanii response`, resp.status, body);
                    results[inputName].push(body['id']);
                } else {
                    console.log(`Scanii fetch call failure`, resp.status, resp.statusText);
                }
            }
        }

        console.log(`scanii trigger results`, results);

        return results;
    }

    public async pollScaniiResults(idsByName: IScaniiIdsByName): Promise<IScanResults> {
        const results: IScanResults = {};
        for (const inputName of Object.keys(idsByName)) {
            results[inputName] = [];
            for (const id of idsByName[inputName]) {
                let noResults = true;
                const startTStamp = new Date().getTime() / 1000;
                while (noResults) {
                    const curTStamp = new Date().getTime() / 1000;
                    if ((startTStamp + (60 * 5)) < curTStamp) {
                        // scan shouldn't take more than 5 minutes
                        noResults = false;
                    }
                    const resp = await fetch(`${SCANII_URL}/${id}`, {
                        headers: { Authorization: `Basic ${this.config.scaniiApiKey}` }
                    });

                    if (resp.status === 404) {
                        // object hasn't yet been created by scanii
                        await sleep(2000);
                    } else if (resp.status >= 400) {
                        // error occured
                        console.log(`Scanii file results call failure`, resp.status, resp.statusText);
                        noResults = false;
                    } else {
                        // check body to see if finished
                        const body = await resp.json();
                        if (body['content_length'] && body['findings']) {
                            // it's finished
                            const hasFindings = body['findings']?.length > 0;
                            if (hasFindings) {
                                this.findingsStrings = this.findingsStrings.concat(body['findings']);
                            }
                            results[inputName].push({
                                hasFindings,
                                rawResults: body
                            });
                            noResults = false;
                        } else if (body['error']) {
                            throw new Error(`Scanii Error: ${body['error']}`);
                        } else {
                            // not finished
                            await sleep(2000);
                        }
                    }
                }
            }
        }

        return results;
    }
}
