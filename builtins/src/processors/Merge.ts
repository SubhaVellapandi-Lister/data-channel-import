import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterInput,
    IStepAfterOutput
} from "@data-channels/dcSDK";

enum MergeMode {
    Concatenate = 'concatenate',
    Update = 'update'
}

export interface IMergeConfig {
    mode: MergeMode;
    baseInputName?: string;
    updateKey?: string;
    deleteColName?: string;
}

export default class Merge extends BaseProcessor {
    private dataRowsByInputName: { [inputName: string]: string[][]} = {};
    private headers: string[] = [];

    public async sort(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            this.headers = input.raw;

            return {
                index: input.index,
                outputs: {
                    [`${input.name}Sorted`]: input.raw
                }
            };
        }

        if (!this.dataRowsByInputName[input.name]) {
            this.dataRowsByInputName[input.name] = [];
        }

        this.dataRowsByInputName[input.name].push(input.raw);

        return { outputs: {} };
    }

    public async after_sort(input: IStepAfterInput): Promise<IStepAfterOutput> {
        const config = input.parameters!['sortConfig'] || {};

        /* for (const [inputName, rows] of Object.entries(this.dataRowsByInputName)) {
            const inputConfig = (config[inputName] || []) as ISortColumnConfig[];
            const sorter = (row1: string[], row2: string[]): number => {
                for (const colConfig of inputConfig) {
                    let val1: string | number = row1[this.headers.indexOf(colConfig.columnName)];
                    let val2: string | number = row2[this.headers.indexOf(colConfig.columnName)];
                    if (colConfig.asNumber) {
                        val1 = parseFloat(val1);
                        val2 = parseFloat(val2);
                    }

                    const descendingModifier = colConfig.descending ? -1 : 1;

                    if (val1 < val2) {
                        return -1 * descendingModifier;
                    } else if (val2 < val1) {
                        return 1 * descendingModifier;
                    }
                }

                return 0;
            };

            rows.sort(sorter);
            for (const row of rows) {
                this.writeOutputRow(input.outputs[`${inputName}Sorted`].writeStream, row);
            }
        } */

        return { results: {} };
    }
}
