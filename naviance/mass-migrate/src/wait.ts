import {
    IJobConfig,
    JobStatus,
    ServiceInterfacer
} from "@data-channels/dcSDK";
import { createWriteStream, mkdirSync } from "fs";
import path from "path";
import request from "request-promise-native";
import {printJobStep} from "./print";
import spin from "./utils/spinner";

export async function sleep(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitOnJobExecution(job: IJobConfig, download?: string, verbose?: boolean): Promise<IJobConfig> {
    let latestJob = job;
    let lastStep = job.currentStep;
    const startTime = new Date().getTime();
    while (latestJob.status === JobStatus.Started) {
        spin.text = `Job ${job.guid} is running (${(new Date().getTime() - startTime) / 1000} seconds elapsed)...`;
        spin.start();
        await sleep(3000);
        latestJob = await ServiceInterfacer.getInstance().getJob(latestJob.guid, download !== undefined);
        spin.stop();
        if (lastStep !== latestJob.currentStep) {
            lastStep = latestJob.currentStep;
            if (verbose) {
                printJobStep(lastStep!, latestJob.steps[lastStep!]);
            }
        }
    }
    if (latestJob.status === JobStatus.Completed) {
        console.log(`Job ${job.guid} complete`);
        if (download !== undefined && latestJob.filesOut) {
            let directory = `data-channels-job-${job.guid}`;
            if (download.length) {
                directory = download;
            }
            mkdirSync(directory, { recursive: true });
            for (const fileInfo of latestJob.filesOut) {
                if (fileInfo.s3!.downloadURL) {
                    spin.text = `Downloading ${fileInfo.name}...`;
                    spin.start();
                    await downloadFile(fileInfo.s3!.downloadURL!, path.join(directory, `${fileInfo.name}.csv`));
                    spin.stop();
                }
            }
            console.log(`Output files downloaded to ${directory}`);
        }
    }
    if (latestJob.status === JobStatus.Failed) {
        console.log(`Job ${job.guid} failed:`, latestJob.statusMsg);
    }

    return latestJob;
}

export async function downloadFile(uri: string, destination: string) {
    const file = createWriteStream(destination);
    await new Promise((resolve, reject) => {
        request({
            uri,
            headers: {
                Accept: 'text/csv',
            },
            gzip: true
        })
        .pipe(file)
        .on('finish', () => {
            resolve();
        })
        .on('error', (error) => {
            reject(error);
        });
    });
}
