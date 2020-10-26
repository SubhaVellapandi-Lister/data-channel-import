import {
    BaseProcessor,
    IRowData,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterInput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";

enum GroupMode {
    Objects = 'objects', // grouped data should be put into an array as objects with headers as properties
    Rows = 'rows' // grouped data should be put into an array of string arrays
}

export interface IGroupByConfig {
    header: string;
    mode?: GroupMode;
}

export interface IGroupedRow {
    rows: string[][] | IRowData[];
    headers?: string[];
    [headerName: string]: any;
}

export class GroupBy extends BaseProcessor {
    private config: IGroupByConfig = { header: '' };
    private latestGroupId: string | undefined;
    private latestGroup: any[] = [];
    private outputName: string = '';
    private groupRowCounts: number[] = [];
    private headerRow: string[] = [];

    private groupRow(headerName: string): string {
        const rowObject: IGroupedRow = {
            [headerName]: this.latestGroupId,
            rows: this.latestGroup
        };
        if (this.config.mode === GroupMode.Rows) {
            rowObject.headers = this.headerRow;
        }
        const rowString = JSON.stringify(rowObject);

        this.groupRowCounts.push(this.latestGroup.length);

        this.latestGroup = [];

        return rowString;
    }

    public async before_groupby(input: IStepBeforeInput): Promise<IStepBeforeInput> {
        this.config = input.parameters!['groupByConfig'] || { header: '' };

        return {};
    }

    public async groupby(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        this.outputName = `${input.name}Grouped`;

        if (input.index === 1) {
            this.headerRow = input.raw;

            return {
                outputs: {
                    [this.outputName]: ['JSON_OBJECT']
                }
            };
        }

        const outputs = {};
        if (this.latestGroupId !== undefined && input.data[this.config.header] !== this.latestGroupId) {
            outputs[this.outputName] = [this.groupRow(this.config.header)];
        }

        if (this.config.mode === GroupMode.Rows) {
            this.latestGroup.push(input.raw);
        } else {
            this.latestGroup.push(input.data);
        }
        this.latestGroupId = input.data[this.config.header];

        return {
            outputs
        };
    }

    public async after_groupby(input: IStepAfterInput): Promise<IStepAfterOutput> {
        const config: IGroupByConfig = input.parameters!['groupByConfig'] || {};

        const outputs = {};
        if (this.latestGroup.length) {
            outputs[this.outputName] = [this.groupRow(config.header)];
        }

        this.groupRowCounts.sort();
        const medianGroupSize = this.groupRowCounts.length > 0 ?
            this.groupRowCounts[Math.floor(this.groupRowCounts.length / 2)] : 0;

        return {
            outputs,
            results: {
                medianGroupSize,
                totalGroups: this.groupRowCounts.length
            }
        };
    }
}
