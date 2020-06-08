import {
    PlanningEngine, RulesRepository
} from "@academic-planner/apSDK";
import { IRowData } from "@data-channels/dcSDK";
import { Readable } from "stream";
import parse from "csv-parse";

export function initServices(parameters: object) {
    const config: any = {
        url: parameters['planningUrl'],
        jwt: parameters['JWT'] || '',
    };
    if (parameters['auth0ClientId']) {
        config.auth0 = {
            clientId: parameters['auth0ClientId'],
            clientSecret: parameters['auth0ClientSecret'],
            domain: parameters['auth0Domain'],
            audience: parameters['auth0Audience']
        };
    }
    PlanningEngine.init(config);
    const repoConfig = Object.assign({}, config);
    repoConfig.product = 'naviance';
    repoConfig.url = parameters['rulesRepoUrl'];
    RulesRepository.init(repoConfig);
}

export async function getJWT(): Promise<string> {
    return await RulesRepository.getInstance().getJwt();
}

export const sleep = (milliseconds: number) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export function getRowVal(rowData: IRowData, colName: string) {
    function fixColName(n: string) {
        return n.toUpperCase().replace(/_/g, '').replace(/\s/g, '');
    }
    const dataColNames = Object.keys(rowData);
    let val: string | undefined;
    for (const dataCol of dataColNames) {
        if (fixColName(dataCol) === fixColName(colName)) {
            val = rowData[dataCol];
            break;
        }
    }
    if (val === 'NULL') {
        return undefined;
    }

    return val;
}

export function csvReadableToStrings (csvstream: Readable): Promise<string[][]> {
    const parser = parse({ bom: true, skip_empty_lines: true, skip_lines_with_empty_values: true, delimiter: ','});

    const results: string[][] = [];

    return new Promise((resolve, reject) => {
        parser.on('readable', async () => {
            let record = parser.read();
            while (record) {
                const raw = record as string[];
                results.push(raw);
                record = parser.read();
            }
        });
        parser.on('end', () => {
            resolve(results);
        });
        csvstream.pipe(parser);
    });
}