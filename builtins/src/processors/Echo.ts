import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterInput,
    IStepAfterOutput
} from "@data-channels/dcSDK";

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
        return {
            results: {
                dataType: this.dataType,
                totalCharacters: this.totalCharacters,
                rows: this.rows
            }
        };
    }

}
