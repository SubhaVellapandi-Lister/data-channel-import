import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterInput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";

export interface IEchoConfig {
    outputAllRows?: boolean;
}

export default class Echo extends BaseProcessor {
    private dataType = 'string';
    private totalCharacters = 0;
    private rows: { [inputName: string]: any[]} = {};
    private config: IEchoConfig = {};

    public async echo(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        console.log(`${input.index}: ${input.raw}`);
        if (input.index === 1) {
            if (input.raw[0] === 'JSON_OBJECT') {
                this.dataType = 'json';
            }
        } else {
            this.totalCharacters += input.raw.reduce((acc, next) => acc + next.length, 0);
        }

        this.pushRow(input.json!, input.name);

        return {
            outputs: {
                [`${input.name}Echo`]: input.raw
            }
        };
    }

    public async before_echo(input: IStepBeforeInput): Promise<void> {
        this.config = (input.parameters!['echoConfig'] || {}) as IEchoConfig;
    }

    public async after_echo(input: IStepAfterInput): Promise<IStepAfterOutput> {
        const rowsLabel = this.config.outputAllRows ? 'rows' : 'firstAndLastRows';

        return {
            results: {
                dataType: this.dataType,
                totalCharacters: this.totalCharacters,
                [rowsLabel]: this.rows
            }
        };
    }

    private pushRow(row: any, inputName: string): void {
        if (!this.rows[inputName]) {
            this.rows[inputName] = [row];

            return;
        }

        if (this.config.outputAllRows || this.rows[inputName].length < 2) {
            this.rows[inputName].push(row);
        } else {
            this.rows[inputName][1] = row;
        }
    }
}
