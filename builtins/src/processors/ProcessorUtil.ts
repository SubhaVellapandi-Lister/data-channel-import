import { IRowProcessorInput } from "@data-channels/dcSDK";

export class ProcessorUtil {
  public jobOutFileExtension: string = ".output";
  public findNextJobStep(flow: string[], currentStep: string): string {
      return flow.slice(flow.indexOf(currentStep) + 1)[0];
  }
  public findPreviousJobStep(flow: string[], currentStep: string): string {
      return flow.slice(0, flow.indexOf(currentStep)).slice(-1)[0];
  }
  public getFilePathFromInputFile(inputFile: IRowProcessorInput): string {
      return inputFile.fileInfo?.key?.match(new RegExp("(.*/)"))?.[0] ?? "";
  }
  public getBucketDetailsFromInputFile(inputFile: IRowProcessorInput): string {
      return inputFile.fileInfo?.bucket ?? "";
  }
  public getFileNameFromInputFile(
      inputFile: IRowProcessorInput,
      jobOutFileExtension: string
  ): string {
      return (
      inputFile.fileInfo?.key
        ?.match(
          new RegExp(
              `([a-zA-Z0-9_]*${inputFile.name}${jobOutFileExtension})\\.csv`
          )
        )?.[1]
        .replace(`${jobOutFileExtension}`, "") ?? inputFile.name
      );
  }
  public toCamelCase(input: string): string {
      return input.toLowerCase().replace(/(?:(^.)|(\s+.))/g, (match) => {
          return match.charAt(match.length - 1).toUpperCase();
      });
  }
}
