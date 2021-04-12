import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterOutput,
    IStepBeforeInput,
    RowOutputValue
} from "@data-channels/dcSDK";
import { isEmpty } from "lodash";

import {
    findNextJobStep,
    findPreviousJobStep,
    getBucketDetailsFromInputFile,
    getFileNameFromInputFile,
    getFilePathFromInputFile,
    toCamelCase,
    jobOutFileExtension,
    getKeyValueCaseInsensitive,
    IFileLogMetrics,
    checkExistingMetaIfEmpty
} from "../ProcessorUtil";

import { DateValidator } from "./DateValidator";
import { EmailValidator } from "./EmailValidator";
import { RangeValidator } from "./RangeValidator";
import {
    ValidateDataType,
    ValidateStatus,
    IValidateParameters,
    IFileConfig,
    IFileValidateConfig,
    IFileConfigColumns,
    ValidateComparatorMessage,
    NavianceStatus
} from "./Validate.interface";
import { fieldTypeMap } from "./ValidationConstants";

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
  private rangeValidator: RangeValidator = new RangeValidator();
  private rangeLimitSetters = new Set<string>();
  private errorLogMetrics: IFileLogMetrics = {};
  private logDataValue: any;
  private logDetails = { processor: { validate: {} } };
  private invalidcountValue: number = 0;
  private warningCountValue: number = 0;
  private validCountValue: number = 0;
  private totalDataCount: number = 0;
  private existingMetaData = { processors: {} };
  private validationStatus = ValidateStatus.Valid;
  private validTypeFormat: boolean = true;

  /**
   * Method used to call before the processor begins to process the data.
   * @param input IStepBeforeInput
   */
  public async before_validate(input: IStepBeforeInput): Promise<void> {
      this.config = input.parameters as IValidateParameters;
      if (this.config.multipleFileConfig && isEmpty(this.config.fileValidateConfig)) {
          throw new Error("Missing fileValidateConfig in Validate-Builtin");
      } else if (!this.config.multipleFileConfig && !this.config.validateConfig) {
          throw new Error("Missing validateConfig in Validate-Builtin");
      }
      this.currentStep = this.job.currentStep ?? "";
      this.nextStep = findNextJobStep(this.job.flow, this.currentStep);
      this.previousStep = findPreviousJobStep(this.job.flow, this.currentStep);
      if (this.previousStep) {
          this.jobOutFileExtension = toCamelCase(this.previousStep) + jobOutFileExtension;
      }
      if (this.config.jsonSchemaNames?.length && this.config.validateConfig) {
          const { columnConfig, rangeLimitSetters } = this.parseValidationSchema();
          this.config.validateConfig.columns = Object.assign(
              this.config.validateConfig.columns ?? {},
              columnConfig
          );
          this.rangeLimitSetters = rangeLimitSetters;
          this.config.validateConfig.discardInvalidRows = true;
      }
      this.currentStep = toCamelCase(this.currentStep);
  }
  /**
   * Method to validate the file contents based on configurations defined via parameters
   * @param input
   */
  public async validate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
      let inputFileName = input.name; this.validationStatus = ValidateStatus.Valid;
      this.validTypeFormat = true;

      if (this.config.jsonSchemaNames?.length && input.index > 1) {
          this.rangeValidator.setRangeLimitLevels(input.data, this.rangeLimitSetters);
      }
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
          if (this.config.writeErrorDataToJobMeta) {
              this.invalidcountValue = this.warningCountValue = this.totalDataCount = this.validCountValue = 0;
              this.errorLogMetrics[inputFileName] = {
                  totalDataCount: 0,
                  invalidCount: 0,
                  warningCount: 0,
                  validCount: 0,
                  recordIdentifier: {
                      critical: {},
                      warning: {}
                  }
              };
          }
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
              [dataOutputName]: this.dataFileHeaders
          };

          for (const logOutputName of logNames) {
              headerOutputs[logOutputName] = this.logFileHeaders;
          }
          return {
              outputs: headerOutputs
          };
      }

      const validationErrors: string[] = [];
      // evaluating each object entry for the required status and check for valdiation status by using the configs
      for (const [columnName, columnConfig] of Object.entries(updateConfig.columns)) {
          const data = getKeyValueCaseInsensitive(input.data, columnName);
          // eslint-disable-next-line no-undefined
          if (data === undefined) {
              if (columnConfig.required) {
                  validationErrors.push(`Missing required column ${columnName}`);
                  this.validationStatus = ValidateStatus.Invalid;
              }
              continue;
          }

          const warningVal = columnConfig.validWithWarningValues && columnConfig.validWithWarningValues.includes(data);
          // based on the case insensitive parameter value decide on the valid value to be used
          const validValueCase = this.validValueCaseDecider(data, columnConfig);

          if (!validValueCase && warningVal) {
              validationErrors.push(`Invalid Value for ${columnName}`);
              this.validationStatus = ValidateStatus.Warning;
              continue;
          } else if (columnConfig.validValues && !validValueCase) {
              validationErrors.push(`Invalid Value for ${columnName}`);
              if (columnConfig.warnIfNotValidValue) {
                  this.validationStatus = ValidateStatus.Warning;
              } else {
                  this.validationStatus = ValidateStatus.Invalid;
              }
              continue;
          }

          if (!data.length && columnConfig.invalidIfBlank) {
              validationErrors.push(`Column ${columnName} cannot be blank`);
              this.validationStatus = ValidateStatus.Invalid;
          } else if (!data.length && columnConfig.warnIfBlank) {
              validationErrors.push(`Column ${columnName} cannot be blank`);
              this.validationStatus = ValidateStatus.Warning;
          }

          let hasValidType = columnConfig.validTypes ? false : true;
          const compareData = this.getCompareFieldData(input, columnConfig);

          for (const validType of columnConfig.validTypes ?? []) {
              hasValidType = this.valueIsValidType(validType, data, compareData, columnConfig);
              if (hasValidType) {
                  break;
              }
          }

          if (columnConfig.maxLengthValidRange && !this.validTypeFormat) {
              validationErrors.push(`Column ${columnName} should be valid format`);
              this.validationStatus = ValidateStatus.Invalid;
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
                  this.validationStatus = ValidateStatus.Warning;
              }
          }

          if (!hasValidType && this.validTypeFormat) {
              columnConfig.comparator && columnConfig.compareField
                  ? validationErrors.push(
                      `Column ${columnName} must be ${ValidateComparatorMessage[columnConfig.comparator]} the Column ${
                          columnConfig.compareField
                      } and must be of type ${columnConfig.validTypes!.join(", ")}`
                  )
                  : validationErrors.push(`Column ${columnName} must be of type ${columnConfig.validTypes!.join(", ")}`);
              this.validationStatus = ValidateStatus.Invalid;
          } else {
              this.validationStatus = this.rangeValidator.validateRange(parseFloat(data), columnConfig, columnName, validationErrors, this.validationStatus);
              if (columnConfig.maxlength && !(data.length <= columnConfig.maxlength)) {
                  validationErrors.push(`Column ${columnName} exceeds the maximum length of ${columnConfig.maxlength}`);
                  this.validationStatus = ValidateStatus.Invalid;
              }
          }
      }

      const outputs: { [name: string]: RowOutputValue } = {};

      if (this.validationStatus !== ValidateStatus.Invalid || !updateConfig.discardInvalidRows) {
      // write data output
          let dataOutputRow = input.raw;
          if (updateConfig.includeLogInData) {
              dataOutputRow = [...dataOutputRow, this.validationStatus, validationErrors.join("; ")];
          }
          outputs[dataOutputName] = dataOutputRow;
      }

      const logDataByHeader = {
          Row: input.index.toString(),
          [statusName]: this.validationStatus,
          [infoName]: validationErrors.join("; ")
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

      if (this.config.writeErrorDataToJobMeta) {
          this.setJobMetData(outputs, this.logFileHeaders, inputFileName);
      }

      return {
          error: this.validationStatus === ValidateStatus.Invalid,
          outputs
      };
  }

  private parseValidationSchema(): {
      columnConfig: IFileConfigColumns;
      rangeLimitSetters: Set<string>;
      } {
      const columnConfig: IFileConfigColumns = {},
          rangeLimitSetters = new Set<string>(this.rangeLimitSetters);

      if (!this.config.jsonSchemaNames?.length) {
          return {
              columnConfig,
              rangeLimitSetters
          };
      }

      for (const schemaName of this.config.jsonSchemaNames) {
          const validationSchema: { [key: string]: any } = this.config[schemaName] ?? {};

          for (const fieldSchema of Object.values(validationSchema)) {
              const fieldName = fieldSchema.name;
              columnConfig[fieldName] = {
                  required: !fieldSchema.optional
              };

              if (fieldSchema.dependsOn) {
                  columnConfig[fieldName].dependsOn = fieldSchema.dependsOn;
                  rangeLimitSetters.add(fieldSchema.dependsOn);
              }

              columnConfig[fieldName].validTypes = [fieldTypeMap[fieldSchema.type] ?? fieldSchema.type];

              columnConfig[fieldName].validValues = fieldSchema.validValues;

              if (fieldSchema.min || fieldSchema.max) {
                  const maxVal = fieldSchema.max ?? Number.MAX_SAFE_INTEGER;
                  columnConfig[fieldName].range = {
                      minVal: fieldSchema.min ?? 0,
                      maxVal
                  };
              }
          }
      }

      return {
          columnConfig,
          rangeLimitSetters
      };
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
              if (columnConfig.maxLengthValidRange) {
                  const decimalCount = this.decimalCount(data);
                  hasValidType = (decimalCount <= columnConfig.maxLengthValidRange[typeToCheck]) ? true : false;
                  this.validTypeFormat = hasValidType;
              } else {
                  hasValidType = true;
              }
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
          if (typeof data === 'string') {
              if (columnConfig.maxLengthValidRange) {
                  hasValidType = (data.length <= columnConfig.maxLengthValidRange[typeToCheck]) ? true : false;
                  this.validTypeFormat = hasValidType;
              } else {
                  hasValidType = true;
              }
          }
          break;
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
                      bucket: `${getBucketDetailsFromInputFile(input)}`
                  }
              }
          });
      }
      if (this.config!.dynamicInput && this.nextStep) {
          await this.createInput({
              name: `${inputFileName}${this.currentStep}d->${input.name}`,
              step: `${this.nextStep}`
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

  /**
   * This method stores critical and warning details into job's meta
   * @param outputs
   */
  private setJobMetData(
      outputs: { [name: string]: RowOutputValue },
      headerData: string[],
      inputFileName: string
  ): void {
      const result: any = {};
      const objectValue = inputFileName + 'DataLog';
      this.logDataValue = outputs.log ? outputs.log : outputs[objectValue];

      for (const i in headerData) {
          result[headerData[i]] = this.logDataValue[i];
      }

      this.totalDataCount++;
      this.errorLogMetrics[inputFileName].totalDataCount = this.totalDataCount;
      switch (result.Validation_Status) {
      case 'invalid':
          ++this.invalidcountValue;
          this.errorLogMetrics[inputFileName].invalidCount = this.invalidcountValue;
          this.errorLogMetrics[inputFileName].recordIdentifier.critical[result.Row] = result.Validation_Info;
          break;
      case 'warning':
          ++this.warningCountValue;
          this.errorLogMetrics[inputFileName].warningCount = this.warningCountValue;
          this.errorLogMetrics[inputFileName].recordIdentifier.warning[result.Row] = result.Validation_Info;
          break;
      case 'valid':
          ++this.validCountValue;
          this.errorLogMetrics[inputFileName].validCount = this.validCountValue;
          break;
      }
  }

  private setNavianceStatus(): void {
      let navianceStatus: string;
      switch (this.validationStatus) {
      case ValidateStatus.Valid:
          navianceStatus = NavianceStatus.TestingCompleted;
          break;
      case ValidateStatus.Warning:
          navianceStatus = NavianceStatus.TestingCompletedWithAlerts;
          break;
      case ValidateStatus.Invalid:
          navianceStatus = NavianceStatus.CriticalError;
          break;
      default:
          navianceStatus = "";
      }

      const isLastStep = this.job.flowIdx === this.job.flow.length - 1;
      if (!isLastStep && this.validationStatus !== ValidateStatus.Invalid) {
          navianceStatus = NavianceStatus.ImportInProgress;
      }

      this.job.setMetaValue('navianceStatus', navianceStatus);
  }

  public async after_validate(): Promise<IStepAfterOutput> {
      if (this.config.writeErrorDataToJobMeta) {
          this.logDetails.processor.validate = this.errorLogMetrics;
          const checkUpdateStatus = checkExistingMetaIfEmpty(this.job);
          if (checkUpdateStatus) {
              this.job.setMetaValue('processors', this.logDetails.processor);
          } else {
              this.existingMetaData['processors'] = this.logDetails.processor;
              this.job.setMetaValue('processors', this.existingMetaData.processors);
          }
      }
      this.setNavianceStatus();
      return {
          results: {}
      };
  }

  //Counts number of digits after decimal point
  private decimalCount(num: number | any): number {
      const decimalString = String(num);
      if (decimalString.includes('.')) {
          return decimalString.split('.')[1].length;
      }
      return 0;
  }

  //Some Getters For Unit Tests
  public getCurrentStep = (): string => this.currentStep;
  public getPreviousStep = (): string => this.previousStep;
  public getJobOutFileExtension = (): string => this.jobOutFileExtension;
}
