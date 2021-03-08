import {Annotations, Course, PlanContext, PlanningEngine, RulesRepository, StudentPlan} from "@academic-planner/apSDK";
import {CourseImport} from "./Course";
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
        const plan = await studentHistory.findActivePlanThatHaveNoCourses('apCli', 'apCli');
        expect(plan?.studentPrincipleId).toEqual("apCli");
        await studentHistory.findAndUpdateActivePlanPlannedCourses(
            "apCli",
            "apCli",
            [{courseId: "1003214", studentId: "apCli", creditAttempted: 2, gradeLevel: 9 }]);
    });

    describe('processBatch',  () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        PlanningEngine.getInstance = jest.fn().mockReturnValue({
            getProduct: jest.fn(),
            createOrUpdateStudentRecords: jest.fn()}
            );

        test.each`
        importSettings               | intent
        ${undefined}                 | ${'upgraded per grade if import settings is not provided'}
        ${{overrideData: false}}     | ${'upgraded per grade if data is not intended to be overridden'}
        ${{overrideData: undefined}} | ${'upgraded per grade if importSettings.overrideData is not provided'}
        ${{overrideData: true}}      | ${'not upgraded per grade if data is intended to be overridden'}
        `('createOrUpdateStudentRecords are $intent', async ({importSettings}) => {
            const createOrUpdateStudentRecordsMock = jest.spyOn(PlanContext, 'createOrUpdateStudentRecords');
            createOrUpdateStudentRecordsMock.mockResolvedValue({
                created: true,
                updated: false,
                studentRecords: []
            });
            jest.spyOn(CourseImport, 'getBatchOfCourses').mockResolvedValue([
                {
                    name: 'course1',
                }
            ] as Course[]);
            jest.spyOn(StudentPlan, 'find').mockReturnValue({
                page: jest.fn().mockResolvedValue([])
            } as any);

            // if all grades data is not intended to be overridden, records are updated per grade
            const expectedUpdatePerGrade = importSettings === undefined || importSettings.overrideData === undefined
                ? true
                : !importSettings.overrideData;
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
            const batch = [[historyRow]];
            const studentHistory = new StudentHistory(
                'scope',
                'ns',
                1,
                true,
                true,
                importSettings
            );

            await studentHistory.processBatch(batch);

            expect(createOrUpdateStudentRecordsMock).toHaveBeenCalledWith(
                'studentId',
                'migration',
                'scope',
                {},
                [],
                true,
                true,
                expectedUpdatePerGrade,
            );
        });
    });
});
