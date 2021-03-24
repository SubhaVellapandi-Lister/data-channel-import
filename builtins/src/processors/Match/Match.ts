import {
    BaseProcessor,
    IStepBeforeInput,
    IRowData,
    IRowProcessorInput,
    IRowProcessorOutput
} from "@data-channels/dcSDK";

import {
    IMatchConfig,
    IMatchColumn,
    IMatchValueRow,
    IMatchValueStorage,
    IMatchLookupMatchIndex,
    MatchColumnDataType
} from "./Match.interface";

export class Match extends BaseProcessor {
    private config!: IMatchConfig;
    // lookups stores the data in the lookup inputs that would be needed for matching against the source
    private lookups: IMatchValueStorage = {};
    // matchedHeaders stores source headers plus any headers that will be added based on config
    private matchedHeaders: string[] = [];
    // matchedSourceItemIndexes stores the matches between a source row, a lookup, and the matching criteria that the two matched on
    private matchedSourceItemIndexes: IMatchLookupMatchIndex = {};

    public async before_matchFields(input: IStepBeforeInput): Promise<void> {
        if (!input.parameters!['matchConfig']) {
            throw new Error('matchConfig required');
        }

        this.config = (input.parameters!['matchConfig'] || {}) as IMatchConfig;
    }

    public async matchFields(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        const matchedOutputName = this.config.matchedOutputName ?? `${input.name}Matched`;
        const unmatchedOutputName = this.config.unmatchedOutputName ?? `${input.name}Unmatched`;
        const errorsOutputName = this.config.errorsOutputName ?? `${input.name}MatchErrors`;

        if (input.index === 1) {
            if (input.name !== this.config.sourceInputName) {
                return { outputs: {} };
            }

            this.matchedHeaders = [...input.raw];

            // if source input, then we need to add any target column names as specified in the config
            for (const columnName of this.config.targetColumnNames) {
                if (!this.matchedHeaders.includes(columnName)) {
                    this.matchedHeaders.push(columnName);
                }
            }

            return {
                outputs: {
                    [matchedOutputName]: this.matchedHeaders,
                    [unmatchedOutputName]: input.raw,
                    [errorsOutputName]: ['ErrorRowIndex', 'ErrorMessage']
                }
            };
        }

        for (const [matchItemIndex, matchItem] of this.config.matchItems.entries()) {
            if (matchItem.lookupInputName === input.name) {
                // intialize stored lookups for this lookup input

                if (!this.lookups[matchItem.lookupInputName]) {
                    this.lookups[matchItem.lookupInputName] = [];
                    this.matchedSourceItemIndexes[matchItem.lookupInputName] = {};
                }

                const lookupRow: IMatchValueRow = {
                    criteria: [],
                    targets: {},
                    lookupRow: input.index,
                    matchItemIndex
                };

                for (const matchColumn of matchItem.matchColumns) {
                    lookupRow.criteria.push({
                        name: matchColumn.lookupColumnName,
                        value: input.data[matchColumn.lookupColumnName] ?? input.json[matchColumn.lookupColumnName]
                    });
                }
                for (const lookupColumnName of Object.keys(matchItem.lookupTargets)) {
                    lookupRow.targets[matchItem.lookupTargets[lookupColumnName]] = input.data[lookupColumnName] ?? input.json[lookupColumnName];
                }

                this.lookups[matchItem.lookupInputName].push(lookupRow);
            } else if (this.config.sourceInputName === input.name) {
                // Do the actual mapping between the given source row, and any lookups

                const rowMatch = this.matchLookupRow(input.data, this.lookups[matchItem.lookupInputName], matchItemIndex, matchItem.matchColumns);

                if (rowMatch) {
                    const existMatchIdx = this.matchedSourceItemIndexes[matchItem.lookupInputName][rowMatch.lookupRow];

                    if ((this.config.targetMustBeUnique && existMatchIdx !== undefined) ||
                        (this.config.targetMustBeUniquePerMatchType && existMatchIdx !== undefined && matchItemIndex != existMatchIdx)) {
                        return {
                            outputs: {
                                [errorsOutputName]: [input.index.toString(), 'Duplicate lookup usage']
                            }
                        };
                    }
                    this.matchedSourceItemIndexes[matchItem.lookupInputName][rowMatch.lookupRow] = matchItemIndex;

                    input.data = Object.assign(input.data, rowMatch.targets);

                    const flatRow: string[] = this.matchedHeaders.map((headerName) => (input.data[headerName] || '').toString());
                    return {
                        outputs: {
                            [matchedOutputName]: flatRow
                        }
                    };
                }
            }
        }

        return {
            outputs: {
                [unmatchedOutputName]: input.raw
            }
        };
    }

    private matchLookupRow(sourceData: IRowData, lookupRows: IMatchValueRow[], matchItemIndex: number, matchColumns: IMatchColumn[]): IMatchValueRow | undefined {
        for (const lrow of lookupRows) {
            if (lrow.matchItemIndex !== matchItemIndex) {
                continue;
            }
            let rowMatch = true;
            for (const matchCol of matchColumns) {
                let colMatch = false;
                for (const lvalue of lrow.criteria) {
                    if (lvalue.name == matchCol.lookupColumnName) {
                        colMatch = this.valueCompare(lvalue.value, sourceData[matchCol.sourceColumnName], matchCol.dataType);
                    }
                }
                if (!colMatch) {
                    rowMatch = false;
                    break;
                }
            }
            if (rowMatch) {
                return lrow;
            }
        }
    }

    private valueCompare(val1: any, val2: any, dataType: MatchColumnDataType): boolean {
        switch (dataType) {
        case MatchColumnDataType.Number:
            try {
                return Number(val1) === Number(val2);
            } catch {
                return val1 === val2;
            }
        case MatchColumnDataType.Date:
            try {
                return val1 === val2 || new Date(val1).toDateString() === new Date(val2).toDateString();
            } catch {
                return val1 === val2;
            }
        case MatchColumnDataType.String:
            try {
                return (val1 as string).trim() === (val2 as string).trim();
            } catch {
                return val1 === val2;
            }
        default:
            return val1 === val2;
        }
    }
}
