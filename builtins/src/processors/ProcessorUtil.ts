import { IMeta, IRowData, IRowProcessorInput, Job } from "@data-channels/dcSDK";

export const jobOutFileExtension = "d.output";

export function findNextJobStep(flow: string[], currentStep: string): string {
    const indexOfStep = flow.indexOf(currentStep);
    return indexOfStep === -1 || (indexOfStep + 1) === flow.length ? "": flow[indexOfStep + 1];
}

export function findPreviousJobStep(flow: string[], currentStep: string): string {
    const indexOfStep = flow.indexOf(currentStep);
    return indexOfStep > 0 ? flow[indexOfStep - 1] : "";
}
export function getFilePathFromInputFile(inputFile: IRowProcessorInput): string {
    return inputFile.fileInfo?.key?.match(new RegExp("(.*/)"))?.[0] ?? "";
}
export function getBucketDetailsFromInputFile(inputFile: IRowProcessorInput): string {
    return inputFile.fileInfo?.bucket ?? "";
}
export function getFileNameFromInputFile(inputFile: IRowProcessorInput, jobOutFileExt: string): string {
    return (
        inputFile.fileInfo?.key
            ?.match(new RegExp(`([a-zA-Z0-9_]*${inputFile.name}${jobOutFileExt})\\.(csv|txt)`))?.[1]
            .replace(`${jobOutFileExt}`, "") ?? inputFile.name
    );
}
export function toCamelCase(input: string): string {
    return input.toLowerCase().replace(/(?:(^.)|(\s+.))/g, (match) => {
        return match.charAt(match.length - 1).toUpperCase();
    });
}
export function getKeyValueCaseInsensitive(obj: IRowData, prop: string): string | undefined {
    for (const key in obj) {
        if (key.toLowerCase() === prop.toLowerCase()) {
            return obj[key];
        }
    }
}
export interface IFileLogMetrics {
    [fileName: string]: {
      totalDataCount: number;
      invalidCount: number;
      warningCount: number;
      validCount: number;
      recordIdentifier: {
        critical: {};
        warning: {};
      };
    };
  }

export function checkExistingMetaIfEmpty(jobMetaData: Job): boolean {
    const metaData: IMeta | undefined = jobMetaData?.meta;
    return !metaData ? true : false;
}
