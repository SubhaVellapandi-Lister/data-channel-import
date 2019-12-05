
import {
    ChuteToObject, Course, CourseStatement, PlanningEngine, RulesRepository
} from "@academic-planner/apSDK";
import { IRowData } from "@data-channels/dcSDK";

export function initRulesRepo(params: object) {
    const config: any = {
        url: params['rulesRepoUrl'],
        jwt: params['JWT'] || '',
        product: params['rulesRepoProduct']
    };
    if (params['auth0ClientId']) {
        config.auth0 = {
            clientId: params['auth0ClientId'],
            clientSecret: params['auth0ClientSecret'],
            domain: params['auth0Domain'],
            audience: params['auth0Audience']
        };
    }
    console.log('RULES REPO URL', config.url);
    RulesRepository.init(config);
}

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

export function prereqCourseStatement(preqString: string): CourseStatement | null {
    if (preqString.trim().length < 3) {
        return null;
    }
    try {
        const cs = (ChuteToObject.fromString(`
            Course throwaway "throwaway"
                prerequisite ${preqString}.
            end
        `)[0] as Course).statements[0];

        return cs;

    } catch (err) {
        console.log(`could not parse prerequisite ${preqString}`);
        console.log(err);

        return null;
    }
}

export function prereqCourseStatementFromJson(preqList: string[][]): CourseStatement | null {
    const preqString =
        preqList.map((andList) => andList.length > 1 ? `(${andList.join(' and ')})` : andList[0]).join(' or ');

    return prereqCourseStatement(preqString);
}

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
