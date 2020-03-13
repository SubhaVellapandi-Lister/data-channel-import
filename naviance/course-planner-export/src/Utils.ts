import {
    PlanningEngine, RulesRepository
} from "@academic-planner/apSDK";
import { IRowData } from "@data-channels/dcSDK";

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
