import {
    IJobConfig,
    JobStatus,
    ServiceInterfacer
} from "@data-channels/dcSDK";
import { createWriteStream, mkdirSync } from "fs";
import path from "path";
import fetch from "node-fetch";
import {printJobStep} from "./print";
import spin from "./utils/spinner";

export async function sleep(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitOnJobExecution(
    job: IJobConfig, showSpin: boolean = true, timeoutSeconds: number = 1200
): Promise<IJobConfig> {
    let latestJob = job;
    let lastStep = job.currentStep;
    const startTime = new Date().getTime();
    console.log(`Waiting on job ${job.guid}`);
    while (latestJob.status === JobStatus.Started) {
        if (showSpin) {
            spin.text = `Job ${job.guid} is running (${(new Date().getTime() - startTime) / 1000} seconds elapsed)...`;
            spin.start();
        }
        await sleep(5000);
        latestJob = await ServiceInterfacer.getInstance().getJob(latestJob.guid);
        if (showSpin) {
            spin.stop();
        }
        if (lastStep !== latestJob.currentStep) {
            lastStep = latestJob.currentStep;
        }

        const secondsTaken = (new Date().getTime() - startTime) / 1000;
        if (secondsTaken >= timeoutSeconds) {
            console.log(`Timing out job ${job.guid}`);

            return latestJob;
        }
    }

    const totalSeconds = (new Date().getTime() - startTime) / 1000;

    if (latestJob.status === JobStatus.Completed) {
        console.log(`Job ${job.guid} complete - took ${totalSeconds} seconds`);
    }
    if (latestJob.status === JobStatus.Failed) {
        console.log(`Job ${job.guid} failed:`, latestJob.statusMsg);
    }

    return latestJob;
}

export async function downloadFile(uri: string, destination: string) {
    const file = createWriteStream(destination);
    await new Promise((resolve, reject) => {
        const request = fetch(uri, {
            method: 'GET',
            headers: {
                Accept: 'text/csv',
            },
            compress: true
        });
        request.catch((err) => {
            reject(err);
        });
        request.then(response => {
            response.body.pipe(file).on('finish', () => {
                resolve();
            }).on('error', (error) => {
                reject(error);
            });
        });

    });
}
