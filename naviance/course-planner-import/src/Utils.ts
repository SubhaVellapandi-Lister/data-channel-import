
import {
    ChuteToObject, Course, CourseStatement, RulesRepository
} from "@academic-planner/apSDK";

export function initRulesRepo(params: object) {
    RulesRepository.init({
        url: params['rulesRepoUrl'],
        jwt: params['rulesRepoJWT'],
        product: params['rulesRepoProduct']
    });
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
