import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterInput,
    RowOutputValue
} from "@data-channels/dcSDK";

export enum ValidateDataType {
    String = 'string',
    Integer = 'integer',
    Datetime = 'datetime',
    Decimal = 'decimal',
    Boolean = 'boolean'
}

export enum ValidateStatus {
    Valid = 'valid',
    Warning = 'warning',
    Invalid = 'invalid'
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

export default class Validate extends BaseProcessor {
    private logFileHeaders: string[] = [];
    private dataFileHeaders: string[] = [];

    public async validate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        const config = input.parameters!['validateConfig'] as IValidateConfig;
        const statusName = config.validStatusColumnName || 'Validation_Status';
        const infoName = config.validInfoColumnName || 'Validation_Info';
        const dataOutputName = `${input.name}Validated`;
        const logNames: string[] = [];

        if (!config.includeLogInData) {
            logNames.push('log');
        }

        if (config.extraLogFile) {
            logNames.push(config.extraLogFile);
        }

        if (input.index === 1) {
            this.dataFileHeaders = [...input.raw];
            if (config.includeLogInData) {
                this.dataFileHeaders = [...this.dataFileHeaders, statusName, infoName];
            } else if (config.logHeaders) {
                this.logFileHeaders = config.logHeaders;
                if (!this.logFileHeaders.includes('Row')) {
                    this.logFileHeaders = ['Row', ...this.logFileHeaders];
                }
                if (!this.logFileHeaders.includes(statusName)) {
                    this.logFileHeaders.push(statusName);
                }
                if (!this.logFileHeaders.includes(infoName)) {
                    this.logFileHeaders.push(infoName);
                }
            } else if (config.includeDataInLog) {
                this.logFileHeaders = ['Row', ...this.dataFileHeaders, statusName, infoName];
            } else {
                this.logFileHeaders = ['Row', this.dataFileHeaders[0], statusName, infoName];
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
        let validationStatus = ValidateStatus.Valid;
        for (const [colName, colConfig] of Object.entries(config.columns)) {
            const data = input.data[colName];
            if (data === undefined) {
                if (colConfig.required) {
                    validationErrors.push(`Missing required column ${colName}`);
                    validationStatus = ValidateStatus.Invalid;
                }
                continue;
            }

            const warningVal = colConfig.validWithWarningValues && colConfig.validWithWarningValues.includes(data);
            const validVal = !colConfig.validValues || colConfig.validValues.includes(data);

            if (!validVal && warningVal) {
                validationErrors.push(`Invalid Value for ${colName}`);
                validationStatus = ValidateStatus.Warning;
                continue;
            } else if (colConfig.validValues && !validVal) {
                validationErrors.push(`Invalid Value for ${colName}`);
                if (colConfig.warnIfNotValidValue) {
                    validationStatus = ValidateStatus.Warning;
                } else {
                    validationStatus = ValidateStatus.Invalid;
                }
                continue;
            }

            if (!data.length && colConfig.invalidIfBlank) {
                validationErrors.push(`Column ${colName} cannot be blank`);
                validationStatus = ValidateStatus.Invalid;
            } else if (!data.length && colConfig.warnIfBlank) {
                validationErrors.push(`Column ${colName} cannot be blank`);
                validationStatus = ValidateStatus.Warning;
            }

            let hasValidType = colConfig.validTypes ? false : true;
            for (const validType of colConfig.validTypes || []) {
                hasValidType = this.valueIsValidType(validType, data);
                if (hasValidType) {
                    break;
                }
            }

            if (!hasValidType && colConfig.validWithWarningTypes) {
                for (const validType of colConfig.validTypes || []) {
                    hasValidType = this.valueIsValidType(validType, data);
                    if (hasValidType) {
                        break;
                    }
                }
                if (hasValidType) {
                    validationErrors.push(`Column ${colName} should be of type ${colConfig.validTypes!.join(', ')}`);
                    validationStatus = ValidateStatus.Warning;
                }
            }

            if (!hasValidType) {
                validationErrors.push(`Column ${colName} must be of type ${colConfig.validTypes!.join(', ')}`);
                validationStatus = ValidateStatus.Invalid;
            }
        }

        const outputs: { [name: string]: RowOutputValue } = {};

        if (validationStatus !== ValidateStatus.Invalid || !config.discardInvalidRows) {
            // write data output
            let dataOutputRow = input.raw;
            if (config.includeLogInData) {
                dataOutputRow = [...dataOutputRow, validationStatus, validationErrors.join('; ')];
            }
            outputs[dataOutputName] = dataOutputRow;
        }

        const logDataByHeader = {
            Row: input.index.toString(),
            [statusName]: validationStatus,
            [infoName]: validationErrors.join('; ')
        };

        for (const [idx, val] of input.raw.entries()) {
            logDataByHeader[this.dataFileHeaders[idx]] = val;
        }

        const logOutputRow: string[] = [];
        for (const logHeaderVal of this.logFileHeaders) {
            logOutputRow.push(logDataByHeader[logHeaderVal] || '');
        }

        for (const logOutputName of logNames) {
            outputs[logOutputName] = logOutputRow;
        }

        return {
            error: validationStatus === ValidateStatus.Invalid,
            outputs
        };
    }

    private valueIsValidType(typeToCheck: ValidateDataType, data: string): boolean {
        let hasValidType = false;
        const upperData = data.toUpperCase();
        switch (typeToCheck) {
        case ValidateDataType.Boolean: {
            if (['TRUE', 'FALSE', '1', '0'].includes(upperData)) {
                hasValidType = true;
            }
            break;
        }
        case ValidateDataType.Integer: {
            if (!data.includes('.') && !isNaN(parseInt(data))) {
                hasValidType = true;
            }
            break;
        }
        case ValidateDataType.Decimal: {
            if (!isNaN(parseFloat(data))) {
                hasValidType = true;
            }
            break;
        }
        case ValidateDataType.Datetime: {
            if (!isNaN(Date.parse(data))) {
                hasValidType = true;
            }
        }
        // eslint-disable-next-line no-fallthrough
        case ValidateDataType.String: {
            hasValidType = true;
        }
        }

        return hasValidType;
    }
}
