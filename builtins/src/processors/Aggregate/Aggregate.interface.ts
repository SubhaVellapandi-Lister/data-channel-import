export interface IAggregateConfig {
    ouputName?: string;
    inputConfigs?: {
        [inputName: string]: IAggregateInputConfig;
    };
    columns?: IAggregateColConfig[];
}


export interface IAggregateColConfig {
    outputColumnName: string;
    // names by input only needed if different from the outputName
    columnNamesByInput?: {
        [inputName: string]: string;
    }
    // delimeter defaults to ','
    combinationDelimeter?: string;
    // instead of combining the data in these columns, put this string in place if there is data (or is not data) for the given columns
    existanceBoolean?: string;
    nonExistanceBoolean?: string;
}

export interface IAggregateInputConfig {
    indexColumnName?: string;
    // columns in this file to not include in the final output
    excludeColumnNames?: string[];
    // columns in this file to include in the final output.  Any columns not in this list will not be included.
    includeColumnNames?: string[];
}

export interface IAggregateStoredValues {
    [inputName: string]: IAggregateStoredRowValue[];
}

export interface IAggregateStoredRowValue {
    startRow: number;
    endRow: number;
    value: string;
}