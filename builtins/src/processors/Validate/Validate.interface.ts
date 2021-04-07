// Interface for validate data types
export enum ValidateDataType {
  String = "string",
  Integer = "integer",
  Datetime = "datetime",
  Decimal = "decimal",
  Boolean = "boolean",
  Email = "email",
}

// Interface for validate status
export enum ValidateStatus {
  Valid = "valid",
  Warning = "warning",
  Invalid = "invalid",
}

export enum NavianceStatus {
  TestingCompleted = "TESTING_COMPLETED",
  TestingCompletedWithAlerts = "TESTING_COMPLETED_WITH_ALERTS",
  ImportInProgress = "IMPORT_IN_PROGRESS",
  ImportCompleted = "IMPORT_COMPLETED",
  ImportCompletedWithAlerts = "IMPORT_COMPLETED_WITH_ALERTS",
  CriticalError = "CRITICAL_ERROR"
}

// Interface for validate comparator
export enum ValidateComparator {
  Greater = "gt",
  Lesser = "lt",
  GreaterEq = "gtEq",
  LesserEq = "ltEq",
  Equal = "eq",
}

// Interface for validate comparator Message
export enum ValidateComparatorMessage {
  gt = "greater than",
  lt = "lesser than",
  gtEq = "greater than or equal to",
  ltEq = "lesser than or equal to",
  eq = "equal to",
}

// Interface for validate date format
export enum ValidateDateFormat {
  YYYY_MM_DD = "YYYY-MM-DD",
  YY_MM_DD_HH_MM_SS = "YYYY-MM-DD HH:MM:SS",
  HH_MM_AM_PM = "HH:MM A",
  YYYYMMDD = "YYYYMMDD",
  YYYYMM = "YYYYMM",
  YYYY = "YYYY",
}

export enum SchemaType {
  Number = "number",
  Date = "date",
}

//These are ranges which dependsOn rangeSetter values to set min max limit for that row
export interface IRangeLimit {
  [key: number]: number;
}

/**
 * Range Limit setters are the columns which sets the min max range limits of other columns
 */
export interface IRangeLevelValues {
  [columnName: string]: number | undefined;
}

export interface IFileConfigColumns {
  [name: string]: IFileConfig;
}

export interface IMaxLengthValidRange {
  [dataType: string]: number;
}

// Interface for file level config
export interface IFileConfig {
  required?: boolean; // invalid if column doesn't exist
  validTypes?: ValidateDataType[]; // list of valid types, if not one of these it's invalid
  validWithWarningTypes?: ValidateDataType[]; // if one of these, considered valid, but with a warning
  validValues?: any[]; // if value is not one of these, it's invalid
  warnIfNotValidValue?: boolean; // if invalid, it's just a warning, not an error
  validWithWarningValues?: any[]; // if value is one of these, it's considered valid, but with a warning
  invalidIfBlank?: boolean; // invalid if the row has a blank value
  warnIfBlank?: boolean; // just a warning if row has a blank value
  dateTimeFormat?: ValidateDateFormat[]; // use a valid datetime format to process starfish file columns like yyyy-mm-dd and yyyy-mm-dd hh:mm:ss
  caseInSensitive?: boolean; // set true to use case insensitive approach for performing validation
  compareField?: string; // compare the column with the given column name or current_date
  comparator?: ValidateComparator; // comparator operations
  maxlength?: number; // if value is exceeds the maxlength config, record is invalid
  range?: {
    minVal?: number; // if value is less than the minVal config, record is invalid
    maxVal?: number; // if value is greater than the maxVal config, record is invalid
  };
  dependsOn?: string;
  maxLengthValidRange?: IMaxLengthValidRange; //if column has multiple datatype with different maxlength
}

// Interface for validate configs
export interface IFileValidateConfig {
  columns: IFileConfigColumns;
  discardInvalidRows?: boolean; // throw away rows from data file if they are invalid
  validStatusColumnName?: string; // log validation status column name
  validInfoColumnName?: string; // log informational message column name
  includeDataInLog?: boolean; // let log include all the data columns in addition to the log columns
  includeLogInData?: boolean; // instead of separate log file, put log columns in the data file
  logHeaders?: string[]; // define headers in the log file that is generated
  extraLogFile?: string; // use a separate log file, put log columns in the named file defined here
}

export interface IValidateConfig {
  columns: {
    [name: string]: {
      required?: boolean; // invalid if column doesn't exist
      validTypes?: ValidateDataType[]; // list of valid types, if not one of these it's invalid
      validWithWarningTypes?: ValidateDataType[]; // if one of these, considered valid, but with a warning
      validValues?: any[]; // if value is not one of these, it's invalid
      warnIfNotValidValue?: boolean; // if invalid, it's just a warning, not an error
      validWithWarningValues?: any[]; // if value is one of these, it's considered valid, but with a warning
      invalidIfBlank?: boolean; // invalid if the row has a blank value
      warnIfBlank?: boolean; // just a warning if row has a blank value
    };
  };
  discardInvalidRows?: boolean; // throw away rows from data file if they are invalid
  validStatusColumnName?: string; // log validation status column name
  validInfoColumnName?: string; // log informational message column name
  includeDataInLog?: boolean; // let log include all the data columns in addition to the log columns
  includeLogInData?: boolean; // instead of separate log file, put log columns in the data file
  logHeaders?: string[];
  extraLogFile?: string;
}
// Interface for channel config parameters.
export interface IValidateParameters {
  validateConfig: IFileValidateConfig;
  fileValidateConfig: {
    [fileName: string]: IFileValidateConfig;
  };
  dynamicOutput: boolean;
  dynamicInput: boolean;
  multipleFileConfig: boolean;
  jsonSchemaNames?: string[];
  writeErrorDataToJobMeta?: boolean;
}
