
import {
    ChuteToObject, Course, CourseStatement, RulesRepository
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
    RulesRepository.init(config);
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
    const val = rowData[colName] || rowData[colName.toUpperCase()];
    if (val === 'NULL') {
        return undefined;
    }

    return val;
}
