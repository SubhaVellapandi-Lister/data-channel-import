export interface IMatchConfig {
    sourceInputName: string;
    matchItems: IMatchItem[];
    targetColumnNames: string[];
    targetMustBeUnique?: boolean;
    targetMustBeUniquePerMatchType?: boolean;
    matchedOutputName?: string; // defaults to `${sourceInputName}Matched`
    unmatchedOutputName?: string; // defaults to `${sourceInputName}Unmatched`
    errorsOutputName?: string; // defaults to `${sourceInputName}MatchErrors`
}

export interface IMatchItem {
    lookupInputName: string;
    matchColumns: IMatchColumn[];
    lookupTargets: {
        [lookupColumnName: string]: string;
    };
}

export enum MatchColumnDataType {
    String = "string",
    Number = "number",
    Date = "date",
    Boolean = "boolean"
}

export interface IMatchColumn {
    lookupColumnName: string;
    sourceColumnName: string;
    dataType: MatchColumnDataType;
}

export interface IMatchValueStorage {
    [inputName: string]: IMatchValueRow[];
}

export interface IMatchValueRow {
    criteria: IMatchValueColumn[];
    lookupRow: number;
    targets: {
        [columnName: string]: any;
    };
    matchItemIndex: number;
}

export interface IMatchLookupMatchIndex {
    [inputName: string]: {
        [lookupRow: number]: number;
    };
}

export interface IMatchValueColumn {
    name: string;
    value: string | number | boolean | Date;
}
