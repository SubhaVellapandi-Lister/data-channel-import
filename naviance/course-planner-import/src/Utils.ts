import {
  AndExpression,
  AnnotationOperator,
  Annotations,
  ChuteToObject,
  Course,
  CourseStatement,
  EquivalentStatement,
  PlanningEngine,
  RulesRepository
} from "@academic-planner/apSDK";
import { IRowData } from "@data-channels/dcSDK";
import _ from "lodash";

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

export function convertToAndExpressions(ids: string[]): AndExpression | string {
  const id: string = ids[0];
  ids = ids.slice(1);

  return !ids.length
    ? id
    : new AndExpression(id, convertToAndExpressions(ids));
}

export function creditRecoveryStatement(value: string): EquivalentStatement | null {
  try {
    const ids = value.split('|').map((id) => id.trim());
    const andExpression = convertToAndExpressions(ids);
    const annotation = new Annotations({
      recovery: {
        value: true,
        operator: AnnotationOperator.EQUALS,
      },
    });

    return new EquivalentStatement(andExpression, undefined, annotation);
  } catch (err) {
    console.log(`could not parse credit recovery ${value}`);
    console.log(err);

    return null;
  }
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

export function prereqCourseStatementFromJson(
    preqList: string[][], existing: CourseStatement | null
): CourseStatement | null {
    if (existing) {
        const jsonFlatIds: string[] = [];
        for (const andList of preqList) {
            for (const id of andList) {
                jsonFlatIds.push(id);
            }
        }
        const existingIds = existing.getExpressions('.*').map((e) => e.expression.identifier);
        if (!_.isEqual(existingIds, jsonFlatIds)) {
            // has changed since last migration, so just return the existing
            return existing;
        }
    }

    const preqString =
        preqList.map((andList) => andList.length > 1 ? `(${andList.join(' and ')})` : andList[0]).join(' or ');

    return prereqCourseStatement(preqString.replace(',', ' AND '));
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

export async function sleep(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
