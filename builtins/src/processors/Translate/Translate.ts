import {
    BaseProcessor,
    ChannelConfig,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepBeforeInput,
} from "@data-channels/dcSDK";
import _ from "lodash";

import {
    findNextJobStep,
    findPreviousJobStep,
    getFilePathFromInputFile,
    getBucketDetailsFromInputFile,
    getFileNameFromInputFile,
    jobOutFileExtension,
    toCamelCase,
} from "../ProcessorUtil";

import { IFileTranslateConfig, ITranslateParameters, RowType } from "./Translate.interface";

/**
 * Translate processor obtains input files, based on config parameters
 * decides on the data to translate and writes in to output file based on the configurations.
 * for example particular column name or value can be translated to the expected value
 * defined in the config
 */
export class Translate extends BaseProcessor {
  private originalHeaders: string[] = [];
  private newHeaders: string[] = [];
  private config!: ITranslateParameters | IFileTranslateConfig;
  private emptyHeaders = new Set<number>();
  private currentRow: string[] = [];
  private fileToTranslate: string = "";
  private inputFileNames: string[] = [];
  private nextStep: string = "";
  private currentStep: string = "";
  private previousStep: string = "";
  private jobOutFileExtension: string = "";
  private dynamicInput: boolean = false;
  private dynamicOutput: boolean = false;
  private multipleFileConfig: boolean = false;
  private updatedConfig!: IFileTranslateConfig;
  /**
   * We can perform our operations before processing a file.
   * We fetch the Input parameters from the channel config
   * in this function as an input.
   * We identifies the jobs current, previous and next step
   * for creating the dynamic outputs and inputs in the
   * processor flow.
   * @param input IStepBeforeInput
   */
  public async before_translate(input: IStepBeforeInput): Promise<void> {
      const configParamters = input.parameters as ITranslateParameters;
      this.dynamicInput = configParamters.dynamicInput;
      this.dynamicOutput = configParamters.dynamicOutput;
      this.multipleFileConfig = configParamters.multipleFileConfig;
      if (this.multipleFileConfig) {
          if (!configParamters.fileTranslateConfig || configParamters.fileTranslateConfig === {}) {
              throw new Error("Missing filetr in Translate-Builtin");
          }
          if (!configParamters.inputFileNames) {
              throw new Error("Kindly specify the 'inputFileNames' parameter in the config.");
          }
          if (configParamters.inputFileNames.length > 0) {
              this.inputFileNames = configParamters.inputFileNames;
          }
      } else if (!this.multipleFileConfig && !configParamters.translateConfig) {
          throw new Error("Missing translateConfig in Translate-Builtin");
      }

      this.currentStep = this.job.currentStep ?? "";
      this.nextStep = findNextJobStep(this.job.flow, this.currentStep);
      this.previousStep = findPreviousJobStep(this.job.flow, this.currentStep);
      if (this.previousStep) this.jobOutFileExtension = toCamelCase(this.previousStep) + jobOutFileExtension;
      this.currentStep = toCamelCase(this.currentStep);
  }

  /**
   * Method to Translate data
   * Process each row from the input.csv file("granularity": "row")
   * @param input IRowProcessorInput
   * @returns {outputs} Translated data
   */
  public async translate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
      const { index, raw, name: inputName } = input;
      if (this.multipleFileConfig) {
          this.fileToTranslate =
        this.inputFileNames.find((fileName: string) => inputName.toLowerCase().includes(fileName)) || "";
      } else {
          this.fileToTranslate = input.name;
      }
      let inputFileName = input.name;
      if (this.dynamicOutput) {
          inputFileName = getFileNameFromInputFile(input, this.jobOutFileExtension);
      }
      if (this.fileToTranslate === "") {
          throw new Error(`Failed to validate translate processor missing input file named ${inputName}.`);
      }
      this.currentRow = raw;

      // index = 1 determines the row header & new file entry
      if (index === 1) {
          if (this.multipleFileConfig) {
              this.config = _.cloneDeep(input.parameters!["fileTranslateConfig"]) as ITranslateParameters;
              this.updatedConfig = this.config[this.fileToTranslate] as IFileTranslateConfig;
          } else {
              this.config = _.cloneDeep(input.parameters!["translateConfig"]) as IFileTranslateConfig;
              this.updatedConfig = this.config;
          }
          if (this.config === null) {
              throw new Error("Missing translateConfig in Translate-Builtin");
          }
          await this.createDynamicInputOutput(inputFileName, input);
          this.originalHeaders = this.currentRow;
          this.newHeaders = this.originalHeaders.map((h, i) => this.mappedHeader(h, i + 1));
          if (
          // eslint-disable-next-line no-undefined
              this.updatedConfig.removeEmptyHeaders === undefined ||
        this.updatedConfig.removeEmptyHeaders === true ||
        this.updatedConfig.removeUnmappedHeaders === true
          ) {
              await this.removeEmptyColumn(RowType.HEADER);
          }
          if (this.updatedConfig.saveIndexMappings) {
              await this.saveIndexMappings();
          }

          if (this.updatedConfig.headerlessFile) {
              await this.checkHeaderRow(inputFileName);

              return {
                  index: index,
                  outputs: {
                      [`${inputFileName}${this.currentStep}d`]: this.currentRow,
                  },
              };
          }
          return {
              index: index,
              outputs: { [`${inputFileName}${this.currentStep}d`]: this.newHeaders },
          };
      }
      if (
      // eslint-disable-next-line no-undefined
          this.updatedConfig.removeEmptyHeaders === undefined ||
      this.updatedConfig.removeEmptyHeaders === true ||
      this.updatedConfig.removeUnmappedHeaders === true
      ) {
          await this.removeEmptyColumn(RowType.ROW);
      }
      // eslint-disable-next-line no-undefined
      if (this.updatedConfig.valueMappings === null || this.updatedConfig.valueMappings === undefined) {
          return {
              index: index,
              outputs: { [`${inputFileName}${this.currentStep}d`]: this.currentRow },
          };
      }
      const fileValueMappingConfig = this.updatedConfig.valueMappings;
      const newRow: string[] = [];
      for (const [rowIndex, rowValue] of this.currentRow.entries()) {
          const valueMapping =
        fileValueMappingConfig![this.newHeaders[rowIndex]] ??
        fileValueMappingConfig![this.originalHeaders[rowIndex]] ??
        [];
          let value = rowValue;
          for (const mappedValue of valueMapping) {
              if (mappedValue.fromValue.toLowerCase() === rowValue.toLowerCase()) {
                  value = mappedValue.toValue;
                  break;
              }
          }
          newRow.push(value);
      }

      return {
          index: index,
          outputs: { [`${inputFileName}${this.currentStep}d`]: newRow },
      };
  }

  /**
   * This method will be called only row header of the new file entry.
   * Update the header index column using the column index provided
   * in the translate config.
   * @param original string
   * @param index number
   */
  private mappedHeader(original: string, index: number): string {
      if (
          (this.updatedConfig.headerMappings || this.updatedConfig.indexMappings) &&
      // eslint-disable-next-line no-undefined
      (this.updatedConfig.removeUnmappedHeaders === undefined || this.updatedConfig.removeUnmappedHeaders === true)
      ) {
          original = "";
      }
      if (this.updatedConfig.headerMappings) {
          return this.updatedConfig.headerMappings[original] ?? original;
      } else if (this.updatedConfig.indexMappings) {
          return this.updatedConfig.indexMappings[index] ?? original;
      }

      return original;
  }

  /**
   * This method will be called only row header of the headerlessFile entry.
   * It will insert the header row using the column indexMappings provided
   * in the translate config.
   * @param inputFileName string
   */
  private async checkHeaderRow(inputFileName: string): Promise<void> {
      if (this.updatedConfig.indexMappings === undefined || null) {
          throw new Error("Headerless files must have indexMappings");
      }
      if (this.originalHeaders.length !== Object.values(this.updatedConfig.indexMappings).length) {
          throw new Error("Headerless column length does not match mapping. Be sure indexMapping accounts for all columns");
      }
      const sortedCols = _.sortBy(Object.entries(this.updatedConfig.indexMappings), (val) => Number(val[0])).map(
          (keyVal) => keyVal[1]
      );

      // @ts-ignore
      this._outputStreams.writeOutputValues({
          [`${inputFileName}${this.currentStep}d`]: sortedCols,
      });
  }

  private async saveIndexMappings(): Promise<void> {
      // Fetch config from service to avoid any weird inline channel stuff
      const channel = await ChannelConfig.getConfig(this.job.channel.guid);
      // eslint-disable-next-line no-undefined
      if (channel === null || channel === undefined) {
      // Something very wrong here
          console.error("Could not get channel config for saveIndexMappings");

          return;
      }
      const steps = channel.steps;
      const currentStep = steps[this.job.currentStep!];

      // This might be a parent config, in which case it isn't safe to modify
      if (
          currentStep === null ||
      // eslint-disable-next-line no-undefined
      currentStep === undefined ||
      currentStep.parameters === null ||
      // eslint-disable-next-line no-undefined
      currentStep.parameters === undefined
      ) {
          console.error(
              `Translate step config not found in channel config.
          Translate step should be defined in parent and child config to support auto-saving`
          );

          return;
      } else if (this.updatedConfig.headerMappings === null && this.updatedConfig.indexMappings === null) {
          return;
      }

      if (this.updatedConfig.headerMappings === null) {
      // First run with index saving, create headerMapping based on current order
          this.updatedConfig.headerMappings = _.fromPairs(_.zip(this.originalHeaders, this.newHeaders));
      }

      this.updatedConfig.indexMappings = _.fromPairs([...this.newHeaders.entries()].map(([i, val]) => [i + 1, val]));
      currentStep.parameters["translateConfig"] = this.config;
      await channel.update({ steps });
  }

  private async removeEmptyColumn(type?: RowType): Promise<void> {
      if (type === RowType.HEADER) {
          for (let idx = 0; idx < this.newHeaders.length; idx++) {
              if (this.newHeaders[idx].trim() === "") {
                  // Saving index for empty header
                  this.emptyHeaders.add(idx);
              }
          }

          const setToEmptyHeadersArray = Array.from(this.emptyHeaders);
          for (let i = setToEmptyHeadersArray.length - 1; i >= 0; i--) {
              // Removing empty header column from both headers
              this.originalHeaders.splice(setToEmptyHeadersArray[i], 1);
              this.newHeaders.splice(setToEmptyHeadersArray[i], 1);
          }
      } else {
          if (this.emptyHeaders.size === 0) {
              return;
          }

          for (let i = this.currentRow.length - 1; i >= 0; i--) {
              if (this.emptyHeaders.has(i)) {
                  this.currentRow.splice(i, 1);
              }
          }
      }
  }

  /**
   * This method is used to create dynamic input and output based
   * on the configs in the parameter
   * @param inputFileName
   * @param input
   */
  private async createDynamicInputOutput(inputFileName: string, input: IRowProcessorInput): Promise<void> {
      if (this.dynamicOutput) {
          await this.createOutput({
              name: `${inputFileName}${this.currentStep}d`,
              details: {
                  name: `${inputFileName}${this.currentStep}d`,
                  s3: {
                      key: `${getFilePathFromInputFile(input)}${inputFileName}${this.currentStep}d.csv`,
                      bucket: `${getBucketDetailsFromInputFile(input)}`,
                  },
              },
          });
      }
      if (this.dynamicInput && this.nextStep.length > 0) {
          await this.createInput({
              name: `${inputFileName}${this.currentStep}d->${this.fileToTranslate}`,
              step: `${this.nextStep}`,
          });
      }
  }
}
