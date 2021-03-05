import { FileUrlMode, Job, urlForFile } from "@data-channels/dcSDK";

export async function sleep(milliseconds: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function urlsForInputNames(job: Job): { [name: string]: string[] } {
    const urlsByName: { [name: string]: string[] } = {};

    for (const fileIn of job.filesIn) {
        urlsByName[fileIn.name] = [];
        if (fileIn.s3!.events) {
            for (const event of fileIn.s3!.events!) {
                if (event.downloadURL) {
                    urlsByName[fileIn.name].push(event.downloadURL);
                } else {
                    const url = urlForFile(
                        fileIn.name,
                        FileUrlMode.Read,
                        job.workspace?.fileUrls!,
                        `${event.bucket}${event.key}`
                    );
                    if (url) {
                        urlsByName[fileIn.name].push(url);
                    }
                }
            }
        } else {
            urlsByName[fileIn.name].push(job.workspace!.fileUrls![`${fileIn.name}_READ`]);
        }
    }

    return urlsByName;
}

export function parseDate(dateString: string): Date | null {
    let date: Date = new Date();
    switch (dateString.toLowerCase()) {
    case "today":
        break;
    case "yesterday":
        date.setDate(date.getDate() - 1);
        break;
    case "tomorrow":
        date.setDate(date.getDate() + 1);
        break;
    default:
        date = new Date(dateString);
        break;
    }
    return date.toJSON() !== null ? date : null;
}
