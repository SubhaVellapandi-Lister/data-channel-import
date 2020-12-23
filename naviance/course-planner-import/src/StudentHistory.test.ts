import {Annotations, Course, PlanningEngine, RulesRepository} from "@academic-planner/apSDK";
import {IHistoryRow, StudentHistory} from "./StudentHistory";
jest.setTimeout(10000);
describe('test student course history', () => {
    test('catalog credits', async () => {
        RulesRepository.init({
            url: 'unknown',
            jwt: ''
        });
        const studentHistory = new StudentHistory('scope', 'ns', 1, false, false);
        studentHistory.courseById['100'] =
            new Course('100', "", Annotations.simple({credits: 3}));
        const catalogCredit100 = studentHistory.catalogCredits('100');
        expect(catalogCredit100).toEqual(3);
    });

    test('create course record from history row', async () => {
        const historyRow: IHistoryRow = {
            studentId: 'studentId',
            courseId: 'courseId',
            creditEarned: 1,
            creditAttempted: 1,
            gradeLevel: 9,
            term: 'term',
            score: 98,
            status: 'PLANNED'
        };
        const studentHistory = new StudentHistory('scope', 'ns', 1, false, false);
        const catalogCredit100 = studentHistory.createCourseRecord(historyRow);
        expect(catalogCredit100).toEqual({
            attemptedCredits: 1,
            credits: 1,
            gradeLevel: 9,
            number: "courseId",
            score: 98,
            status: "PLANNED",
            termId: "term",
            unique: "courseId"
        });

    });

    test('categorize course history', async () => {
        const historyRow: IHistoryRow = {
            studentId: 'studentId',
            courseId: 'courseId',
            creditEarned: 1,
            creditAttempted: 1,
            gradeLevel: 9,
            term: 'term',
            score: 98,
            status: 'PLANNED'
        };
        const studentHistory = new StudentHistory('scope', 'ns', 1, false, false);
        const {completeByKey, incompleteByKey, plannedByKey} =
            studentHistory.categorizeCourseHistoryRowsByStatus([historyRow]);
        expect(plannedByKey).toEqual({
            courseId_9_term: {
                courseId: "courseId",
                creditAttempted: 1,
                creditEarned: 1,
                gradeLevel: 9,
                score: 98,
                status: "PLANNED",
                studentId: "studentId",
                term: "term"
            }
        });
    });

    test.skip('find active plan for local env', async () => {
        RulesRepository.init({
            url: 'http://localhost:8095',
            jwt: ''
        });

        PlanningEngine.init({
            url: 'http://localhost:8097',
            jwt: ''
        });
        const studentHistory = new StudentHistory('apCli', 'naviance.2617970DUS', 1, false, false);
        await studentHistory.loadCatalogCredits([{courseId: "1003214", studentId: "apCli", gradeLevel: 9 }]);
        const plan = await studentHistory.findActivePlanThatHaveNoCourses('apCli');
        expect(plan?.studentPrincipleId).toEqual("apCli");
        await studentHistory.findAndUpdateActivePlanPlannedCourses(
            "apCli",
            [{courseId: "1003214", studentId: "apCli", creditAttempted: 2, gradeLevel: 9 }]);
    });

});
