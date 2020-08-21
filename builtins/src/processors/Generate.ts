import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput
} from "@data-channels/dcSDK";

export enum DataType {
    String = "string",
    Decimal = "decimal",
    Integer = "integer",
    Name = "name"
}

export interface IGenerateConfig {
    [outputName: string]: {
        headers: string[];
        dataTypes: (DataType | string[])[];
        rowCount: number;
    };
}

const FIRST_NAMES = [
    'John',
    'Jane',
    'Ted',
    'Tammy',
    'Sam',
    'Samantha',
    'Kevin',
    'Karen',
    'Stacey',
    'Jennifer',
    'Joe',
    'Cameron',
    'Adam',
    'Anita'
];

const LAST_NAMES = [
    'Doe',
    'Smith',
    'Taylor',
    'Brewer',
    'West',
    'Canterbury',
    'King',
    'Bloomingfield',
    'Stevens',
    'Woods'
];

export default class Generate extends BaseProcessor {

    public async generate(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        const config = input.parameters!['generateConfig'] as IGenerateConfig;

        for (const [outName, outConfig] of Object.entries(config)) {
            const output = input.outputs[outName].writeStream;

            this.writeOutputRow(output, outConfig.headers);
            for (let i = 0; i < outConfig.rowCount; i++) {
                const row: string[] = [];
                for (const dType of outConfig.dataTypes) {
                    switch (dType) {
                        case DataType.String: {
                            row.push(this.randomString(16));
                            break;
                        }
                        case DataType.Integer: {
                            row.push(Math.floor(Math.random() * 100).toString());
                            break;
                        }
                        case DataType.Decimal: {
                            row.push((Math.random() * 100).toString());
                            break;
                        }
                        case DataType.Name: {
                            row.push(this.randomEntry(FIRST_NAMES) + ' ' + this.randomEntry(LAST_NAMES));
                            break;
                        }
                        default: {
                            if (Array.isArray(dType)) {
                                row.push(this.randomEntry(dType));
                            } else {
                                row.push('');
                            }
                            break;
                        }
                    }
                }
                this.writeOutputRow(output, row);
            }
        }

        return {};
    }

    private randomEntry(items: any[]): any {
        return items[Math.floor(Math.random() * items.length)];
    }

    private randomString(length: number): string {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = length; i > 0; --i) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }

        return result;
    }
}
