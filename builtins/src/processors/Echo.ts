import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterInput,
    IStepAfterOutput
} from "@data-channels/dcSDK";

export interface IEchoConfig {
    outputAllRows?: boolean;
}

export default class Echo extends BaseProcessor {
    private dataType = 'string';
    private totalCharacters = 0;
    private rows: any[] = [];

    public async echo(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        console.log(`${input.index}: ${input.raw}`);
        if (input.index === 1) {
            if (input.raw[0] === 'JSON_OBJECT') {
                this.dataType = 'json';
            }
        } else {
            this.totalCharacters += input.raw.reduce((acc, next) => acc + next.length, 0);
        }

        this.rows.push(input.json!);

        return {
            outputs: {
                [`${input.name}Echo`]: input.raw
            }
        };
    }

    public async after_echo(input: IStepAfterInput): Promise<IStepAfterOutput> {
        const config = (input.parameters!['echoConfig'] || {}) as IEchoConfig;

        const firstAndLast = this.rows.length < 2 ? this.rows : [this.rows[1]];
        if (this.rows.length > 2) {
            firstAndLast.push(this.rows.slice(-1)[0]);
        }

        return {
            results: {
                dataType: this.dataType,
                totalCharacters: this.totalCharacters,
                rows: config.outputAllRows ? this.rows : firstAndLast
            }
        };
    }

}
