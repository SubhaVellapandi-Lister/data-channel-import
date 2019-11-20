import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput
} from "@data-channels/dcSDK";

enum ValidateDataType {
    STRING = 'string',
    INTEGER = 'integer',
    DATETIME = 'datetime',
    DECIMAL = 'decimal',
    BOOLEAN = 'boolean'
}

interface IValidateConfig {
    columns: {
        [name: string]: {
            type?: ValidateDataType,
            validValues?: any[],
            notBlank?: boolean
        };
    };
    isValidColumn?: string;
    discardInvalid?: boolean;
}

export default class Validate extends BaseProcessor {

    public async validate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        const config = input.parameters!['validateConfig'] as IValidateConfig;
        if (input.index === 1) {
            return {
                index: input.index,
                outputs: {
                    [`${input.name}Validated`]:
                        config.isValidColumn ? [...input.raw, config.isValidColumn, 'Error_Info'] : input.raw
                }
            };
        }

        const validationErrors: string[] = [];
        for (const [colName, colConfig] of Object.entries(config.columns)) {
            const data = input.data[colName];
            if (data === undefined) {
                continue;
            }
            const upperData = data.toUpperCase();
            if (colConfig.validValues && !colConfig.validValues.includes(data)) {
                validationErrors.push(`Invalid Value for ${colName}`);
                continue;
            }
            if (!data.length && colConfig.notBlank) {
                validationErrors.push(`Column ${colName} cannot be blank`);
            }
            if (colConfig.type) {
                switch (colConfig.type) {
                    case ValidateDataType.BOOLEAN: {
                        if (!['TRUE', 'FALSE', '1', '0'].includes(upperData)) {
                            validationErrors.push(`${colName} is not BOOLEAN`);
                        }
                        break;
                    }
                    case ValidateDataType.INTEGER: {
                        if (data.includes('.') || isNaN(parseInt(data))) {
                            validationErrors.push(`${colName} is not INTEGER`);
                        }
                        break;
                    }
                    case ValidateDataType.DECIMAL: {
                        if (isNaN(parseFloat(data))) {
                            validationErrors.push(`${colName} is not DECIMAL`);
                        }
                        break;
                    }
                    case ValidateDataType.DATETIME: {
                        if (isNaN(Date.parse(data))) {
                            validationErrors.push(`${colName} is not DATETIME`);
                        }
                    }
                }
            }
        }

        if (validationErrors.length && config.discardInvalid) {
            return {
                error: true,
                outputs: {}
            };
        }

        let newRow = input.raw;
        if (config.isValidColumn) {
            newRow = [...input.raw, validationErrors.length ? 'FALSE' : 'TRUE', validationErrors.join(', ')];
        }

        return {
            error: validationErrors.length > 0,
            outputs: {
                [`${input.name}Validated`]: newRow
            }
        };
    }
}
