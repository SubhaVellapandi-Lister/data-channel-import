import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepBeforeInput,
    RowOutputValue,
} from "@data-channels/dcSDK";

import {
    findNextJobStep,
    findPreviousJobStep,
    getBucketDetailsFromInputFile,
    getFileNameFromInputFile,
    getFilePathFromInputFile,
    toCamelCase,
    jobOutFileExtension,
    getKeyValueCaseInsensitive,
} from "../ProcessorUtil";

import { DateValidator } from "./DateValidator";
import { EmailValidator } from "./EmailValidator";
import {
    ValidateDataType,
    ValidateStatus,
    IValidateParameters,
    IFileConfig,
    IFileValidateConfig,
} from "./Validate.interface";

/**
 * Validate processor obtains input files, based on config parameters
 * decides on the data to validate writes in to output file with validation
 * status and validation information based on the configurations.
 * We identifies the jobs current, previous and next step for
 * creating the dynamic outputs and inputs configs in the processor
 * flow.
 */
export class Validate extends BaseProcessor {
  private logFileHeaders: string[] = [];
  private dataFileHeaders: string[] = [];
  private config!: IValidateParameters;
  private nextStep: string = "";
  private currentStep: string = "";
  private previousStep: string = "";
  private jobOutFileExtension: string = "";
  private emailValidator: EmailValidator = new EmailValidator();
  private dateValidator: DateValidator = new DateValidator();
  /**
   * Method used to call before the processor begins to process the data.
   * @param input IStepBeforeInput
   */
  public async before_validate(input: IStepBeforeInput): Promise<void> {
      this.config = input.parameters as IValidateParameters;
      if (this.config.multipleFileConfig) {
          if (!this.config?.fileValidateConfig || this.config?.fileValidateConfig === {}) {
              throw new Error("Missing fileValidateConfig in Validate-Builtin");
          }
      } else if (!this.config.multipleFileConfig && !this.config?.validateConfig) {
          throw new Error("Missing validateConfig in Validate-Builtin");
      }
      this.currentStep = this.job.currentStep ?? "";
      this.nextStep = findNextJobStep(this.job.flow, this.currentStep);
      this.previousStep = findPreviousJobStep(this.job.flow, this.currentStep);
      if (this.previousStep) {
          this.jobOutFileExtension = toCamelCase(this.previousStep) + jobOutFileExtension;
      }
      this.currentStep = toCamelCase(this.currentStep);
  }
  /**
   * Method to validate the file contents based on configurations defined via parameters
   * @param input
   */
  public async validate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
      let inputFileName = input.name;
      if (this.config!.dynamicOutput) {
          inputFileName = getFileNameFromInputFile(input, this.jobOutFileExtension);
      }
      let updateConfig: string[] | IFileValidateConfig = this.config.validateConfig;

      if (this.config!.multipleFileConfig) {
          updateConfig = this.config.fileValidateConfig[input.name] as IFileValidateConfig;
      }
      const statusName = updateConfig.validStatusColumnName || "Validation_Status";
      const infoName = updateConfig.validInfoColumnName || "Validation_Info";
      const dataOutputName = `${inputFileName}${this.currentStep}d`;
      const needExtraLogFile = updateConfig.extraLogFile;
      const needLogHeaders = updateConfig.logHeaders;
      const logNames: string[] = [];

      if (!updateConfig.includeLogInData) {
          logNames.push("log");
      }

      if (needExtraLogFile) {
          logNames.push(needExtraLogFile);
      }

      if (input.index === 1) {
          await this.createDynamicInputOutput(inputFileName, input);
          this.dataFileHeaders = [...input.raw];
          // Add columns statusName and infoName to file headers to track validation status
          if (updateConfig.includeLogInData) {
              this.dataFileHeaders = [...this.dataFileHeaders, statusName, infoName];
          } else if (needLogHeaders) {
              this.logFileHeaders = needLogHeaders;
              if (!this.logFileHeaders.includes("Row")) {
                  this.logFileHeaders = ["Row", ...this.logFileHeaders];
              }
              if (!this.logFileHeaders.includes(statusName)) {
                  this.logFileHeaders.push(statusName);
              }
              if (!this.logFileHeaders.includes(infoName)) {
                  this.logFileHeaders.push(infoName);
              }
          } else if (updateConfig.includeDataInLog) {
              this.logFileHeaders = ["Row", ...this.dataFileHeaders, statusName, infoName];
          } else {
              this.logFileHeaders = ["Row", this.dataFileHeaders[0], statusName, infoName];
          }

          const headerOutputs: { [name: string]: RowOutputValue } = {
              [dataOutputName]: this.dataFileHeaders,
          };

          for (const logOutputName of logNames) {
              headerOutputs[logOutputName] = this.logFileHeaders;
          }
          return {
              outputs: headerOutputs,
          };
      }

      const validationErrors: string[] = [];
      let validationStatus = ValidateStatus.Valid;
      // evaluating each object entry for the required status and check for valdiation status by using the configs
      for (const [columnName, columnConfig] of Object.entries(updateConfig.columns)) {
          const data = getKeyValueCaseInsensitive(input.data, columnName);
          // eslint-disable-next-line no-undefined
          if (data === undefined) {
              if (columnConfig.required) {
                  validationErrors.push(`Missing required column ${columnName}`);
                  validationStatus = ValidateStatus.Invalid;
              }
              continue;
          }

          const warningVal = columnConfig.validWithWarningValues && columnConfig.validWithWarningValues.includes(data);
          // based on the case insensitive parameter value decide on the valid value to be used
          const validValueCase = this.validValueCaseDecider(data, columnConfig);

          if (!validValueCase && warningVal) {
              validationErrors.push(`Invalid Value for ${columnName}`);
              validationStatus = ValidateStatus.Warning;
              continue;
          } else if (columnConfig.validValues && !validValueCase) {
              validationErrors.push(`Invalid Value for ${columnName}`);
              if (columnConfig.warnIfNotValidValue) {
                  validationStatus = ValidateStatus.Warning;
              } else {
                  validationStatus = ValidateStatus.Invalid;
              }
              continue;
          }

          if (!data.length && columnConfig.invalidIfBlank) {
              validationErrors.push(`Column ${columnName} cannot be blank`);
              validationStatus = ValidateStatus.Invalid;
          } else if (!data.length && columnConfig.warnIfBlank) {
              validationErrors.push(`Column ${columnName} cannot be blank`);
              validationStatus = ValidateStatus.Warning;
          }

          let hasValidType = columnConfig.validTypes ? false : true;
          const compareData = this.getCompareFieldData(input, columnConfig);

          for (const validType of columnConfig.validTypes ?? []) {
              hasValidType = this.valueIsValidType(validType, data, compareData, columnConfig);
              if (hasValidType) {
                  break;
              }
          }

          if (!hasValidType && columnConfig.validWithWarningTypes) {
              for (const validType of columnConfig.validTypes ?? []) {
                  hasValidType = this.valueIsValidType(validType, data, compareData, columnConfig);
                  if (hasValidType) {
                      break;
                  }
              }
              if (hasValidType) {
                  validationErrors.push(`Column ${columnName} should be of type ${columnConfig.validTypes!.join(", ")}`);
                  validationStatus = ValidateStatus.Warning;
              }
          }

          if (!hasValidType) {
              validationErrors.push(`Column ${columnName} must be of type ${columnConfig.validTypes!.join(", ")}`);
              validationStatus = ValidateStatus.Invalid;
          } else {
              this.rangeValidation(parseFloat(data), columnConfig, columnName, validationErrors, validationStatus);
              if (columnConfig.maxlength && !(data.length <= columnConfig.maxlength)) {
                  validationErrors.push(`Column ${columnName} exceeds the maximum length of ${columnConfig.maxlength}`);
                  validationStatus = ValidateStatus.Invalid;
              }
          }
      }

      const outputs: { [name: string]: RowOutputValue } = {};

      if (validationStatus !== ValidateStatus.Invalid || !updateConfig.discardInvalidRows) {
      // write data output
          let dataOutputRow = input.raw;
          if (updateConfig.includeLogInData) {
              dataOutputRow = [...dataOutputRow, validationStatus, validationErrors.join("; ")];
          }
          outputs[dataOutputName] = dataOutputRow;
      }

      const logDataByHeader = {
          Row: input.index.toString(),
          [statusName]: validationStatus,
          [infoName]: validationErrors.join("; "),
      };

      for (const [columnIndex, columnValue] of input.raw.entries()) {
          logDataByHeader[this.dataFileHeaders[columnIndex]] = columnValue;
      }

      const logOutputRow: string[] = [];
      for (const logHeaderValue of this.logFileHeaders) {
          logOutputRow.push(logDataByHeader[logHeaderValue] || "");
      }

      for (const logOutputName of logNames) {
          outputs[logOutputName] = logOutputRow;
      }
      return {
          error: validationStatus === ValidateStatus.Invalid,
          outputs,
      };
  }

  /**
   * This method is used to check the range validation
   * @param data
   * @param columnConfig
   * @param columnName
   * @param validationErrors
   * @param validationStatus
   * @returns void
   */
  private rangeValidation(
      data: number,
      columnConfig: IFileConfig,
      columnName: string,
      validationErrors: string[],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
      validationStatus: string
  ): void {
      if ("range" in columnConfig) {
          const range = columnConfig.range || {};
          if (Object.keys(range).length === 0) {
              throw new Error(`column ${columnName} minVal and maxVal config missing in the range validation`);
          }
          if (!("minVal" in range) || !("maxVal" in range)) {
              throw new Error(`column ${columnName} minVal or maxVal config missing in the range validation`);
          }
          if (
              isFinite(data) &&
        (range.minVal || range.minVal === 0) &&
        range.maxVal &&
        !(data >= range.minVal && data <= range.maxVal)
          ) {
              validationErrors.push(`Column ${columnName} must be between ${range.minVal} and ${range.maxVal}`);
              validationStatus = ValidateStatus.Invalid;
          }
      }
  }

  /**
   * Method to check the different valid data types
   * @param typeToCheck
   * @param data
   * @param columnConfig
   */
  private valueIsValidType(
      typeToCheck: ValidateDataType,
      inputData: string,
      compareData: string,
      columnConfig: IFileConfig
  ): boolean {
      let hasValidType = false;
      const data = inputData.toUpperCase();
      switch (typeToCheck) {
      case ValidateDataType.Email: {
          if (this.emailValidator.validateEmail(data, columnConfig.required!)) {
              hasValidType = true;
          }
          break;
      }
      case ValidateDataType.Boolean: {
          if (["TRUE", "FALSE", "1", "0"].includes(data)) {
              hasValidType = true;
          }
          break;
      }
      case ValidateDataType.Integer: {
          if ((!data && !columnConfig.invalidIfBlank) || (!data.includes(".") && !isNaN(parseInt(data)))) {
              hasValidType = true;
          }
          break;
      }
      case ValidateDataType.Decimal: {
          if ((!data && !columnConfig.invalidIfBlank) || !isNaN(parseFloat(data))) {
              hasValidType = true;
          }
          break;
      }
      case ValidateDataType.Datetime: {
          if (
              (columnConfig.dateTimeFormat === undefined || columnConfig.dateTimeFormat === null) &&
          !isNaN(Date.parse(data))
          ) {
              hasValidType = true;
              break;
          }
          hasValidType = this.validateDateFormat(columnConfig, data, compareData, hasValidType);
          break;
      }
      // eslint-disable-next-line no-fallthrough
      case ValidateDataType.String: {
          hasValidType = true;
      }
      }

      return hasValidType;
  }
  /**
   * This method is used to decide on the nature of valid values to compare against the data
   * from the file based on caseInSensitive value set in parameter the behavior is determined
   * @param data
   * @param columnConfig
   * @returns validVal configuration with case definition
   */
  private validValueCaseDecider(data: string, columnConfig: IFileConfig): boolean {
      let validVal: boolean = false;
      const validValueConfig = columnConfig.validValues!;
      if (columnConfig.caseInSensitive && validValueConfig) {
          const validValueUpperCase = validValueConfig.map((validValue) => validValue.toUpperCase());
          validVal =
        !validValueConfig ||
        (!data && !columnConfig.invalidIfBlank) ||
        validValueUpperCase.includes(data.toUpperCase());
      } else {
          validVal = !validValueConfig || (!data && !columnConfig.invalidIfBlank) || validValueConfig.includes(data);
      }

      return validVal;
  }
  /**
   * This method is used to create dynamic input and output based
   * on the configs in the parameter
   * @param inputFileName
   * @param input
   */
  private async createDynamicInputOutput(inputFileName: string, input: IRowProcessorInput): Promise<void> {
      if (this.config!.dynamicOutput) {
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
      if (this.config!.dynamicInput && this.nextStep) {
          await this.createInput({
              name: `${inputFileName}${this.currentStep}d->${input.name}`,
              step: `${this.nextStep}`,
          });
      }
  }
  /**
   * This method used to get the compare field data
   * @param input
   * @param columnConfig
   * @returns compare field column values
   */
  private getCompareFieldData(input: IRowProcessorInput, columnConfig: IFileConfig): string {
      let compareData = "";
      if (columnConfig.compareField && columnConfig.compareField.match("current_date")) {
          compareData = new Date().toUTCString();
      } else if (columnConfig.compareField && input.data[columnConfig.compareField]) {
          compareData = input.data[columnConfig.compareField];
      }
      return compareData;
  }
  /**
   * This method used to validate the date format list for the given data
   * @param inputData
   * @param compareData
   * @param columnConfig
   * @param hasValidFormat
   * @returns boolean
   */
  private validateDateFormat(
      columnConfig: IFileConfig,
      inputData: string,
      compareData: string,
      hasValidFormat: boolean
  ): boolean {
      for (const dateTimeFormat of columnConfig.dateTimeFormat ?? []) {
          if (
              columnConfig.dateTimeFormat !== null &&
        this.dateValidator.validateDateFormat(inputData, columnConfig.required!, dateTimeFormat)
          ) {
              if (compareData.length > 0 && columnConfig.comparator) {
                  hasValidFormat = this.dateValidator.validateDateComparsion(
                      inputData,
                      compareData,
                      columnConfig.comparator,
            columnConfig.required!,
            dateTimeFormat
                  );

                  break;
              }
              hasValidFormat = true;
          }
          if (hasValidFormat) {
              break;
          }
      }
      return hasValidFormat;
  }
}
