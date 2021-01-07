import { ICourseRecord, IStudentRecordSummary } from "@academic-planner/academic-planner-common";
import {Course, PlanContext, PlannedCourse, StudentPlan} from "@academic-planner/apSDK";
import { IRowData, IRowProcessorInput } from "@data-channels/dcSDK";
import _ from "lodash";
import { CourseImport } from "./Course";
import { IBasicNavianceStudent, INavianceStudentIDMap } from "./Student";
import { getRowVal } from "./Utils";

export interface IHistoryRow {
    studentId: string;
    courseId: string;
    creditEarned?: number | undefined;
    creditAttempted?: number;
    gradeLevel: number;
    gradeAwarded?: string;
    term?: string;
    score?: number;
    status?: string;
    teacherName?: string;
    courseName?: string;
    courseSubject?: string;
    schoolId?: string;
}

export enum HistoryStatus {
    Completed = 'Completed',
    Scheduled = 'Scheduled',
    Planned = 'Planned',
    InProgress = 'In Progress'
}

export class StudentHistory {
    public createdCount = 0;
    public updatedCount = 0;
    public errorCount = 0;
    public courseById: { [id: string]: Course } = {};
    private studentIdMap: INavianceStudentIDMap = {};
    private processedStudentIdMap: Record<string, string[]> = {};
    private historyStudentId = '';
    private historyForStudent: IHistoryRow[] = [];
    private historyBatch: IHistoryRow[][] = [];

    constructor(
        private scope: string, private namespace: string, private batchSize: number,
        private updatePlans: boolean, private attachContextsIfNeeded: boolean
    ) {}

    static parseCsvRow(rowData: IRowData): IHistoryRow {
        // import record
        const gradeLevelStr = getRowVal(rowData, 'Grade_Level_Taken');
        const creditEarnedStr: any = getRowVal(rowData, 'Credits_Earned');
        const creditAttemptedStr: any = getRowVal(rowData, 'Credits_Attempted');
        const scoreStr = getRowVal(rowData, 'Score');

        return this.normalizeStatus({
            studentId: (getRowVal(rowData, 'Student_ID') || '').trim(),
            courseId: (getRowVal(rowData, 'Course_ID') || '').trim(),
            gradeLevel: gradeLevelStr ? parseInt(gradeLevelStr) : 0,
            term: getRowVal(rowData, 'Term'),
            courseName: getRowVal(rowData, 'Course_Name'),
            teacherName: getRowVal(rowData, 'Teacher'),
            creditEarned: parseFloat(creditEarnedStr) || undefined,
            creditAttempted: parseFloat(creditAttemptedStr) || undefined,
            gradeAwarded: getRowVal(rowData, 'Letter_Grade'),
            score: scoreStr ? parseFloat(scoreStr) : undefined,
            status: getRowVal(rowData, 'Course_Status')
        });
    }

    static parseHistoryRow(rowData: IRowData): IHistoryRow[] {
        let hist: IHistoryRow;
        const jsonString = rowData['JSON_OBJECT'];
        if (jsonString) {
            const rec = JSON.parse(jsonString);
            if (rec.rows) {
                // pre-grouped csv rows
                if (rec.headers) {
                    // grouped by string array rows
                    const annotatedRows: IRowData[] = [];
                    for (const rawRow of rec.rows) {
                        const zipped = rec.headers.map((headerVal: string, idx: number) => [headerVal, rawRow[idx]]);
                        const annoRow: IRowData = {};
                        for (const objectTup of zipped) {
                            annoRow[objectTup[0]] = objectTup[1];
                        }
                        annotatedRows.push(annoRow);
                    }

                    return annotatedRows.map((row: IRowData) => this.parseCsvRow(row));
                } else {
                    // grouped by object array rows
                    return rec.rows.map((row: IRowData) => this.parseCsvRow(row));
                }
            }

            // migration record
            const studentId = rec.studentId.toString();

            hist = {
                studentId,
                courseId: rec.courseId,
                creditEarned: rec.creditEarned,
                creditAttempted: rec.creditAttempted,
                gradeLevel: rec.gradeLevel,
                term: rec.term,
                gradeAwarded: rec.gradeAwarded || rec.score || undefined,
                score: rec.score,
                status: rec.status,
                teacherName: rec.teacher ? rec.teacher.fullName : undefined,
                courseName: rec.name,
                courseSubject: rec.subjectArea ? rec.subjectArea.name : ''
            };
            hist = this.normalizeStatus(hist);

        } else {
            hist = this.parseCsvRow(rowData);
        }

        return [hist];
    }

    async loadCatalogCredits(histories: IHistoryRow[]) {
        const courseById = this.courseById;
        const neededIds = _.uniq(
            histories
                .filter((hist) => hist.creditEarned === undefined)
                .map((hist) => hist.courseId)
                .filter((cId) => !courseById[cId])
        );
        if (neededIds.length) {
            const courses = await CourseImport.getBatchOfCourses(neededIds, this.namespace);
            for (const course of courses) {
                const courseId = course.annotations.getValue('id') || course.name;
                this.courseById[courseId as string] = course;
            }
        }
    }

    static normalizeStatus(hist: IHistoryRow): IHistoryRow {
        switch (hist.status ? hist.status.toUpperCase().replace(/\s+/g, '') : '') {
            case 'COMPLETED': {
                hist.status = HistoryStatus.Completed;
                break;
            }
            case 'INPROGRESS': {
                hist.status = HistoryStatus.InProgress;
                break;
            }
            case 'PLANNED': {
                hist.status = HistoryStatus.Planned;
                break;
            }
            case 'SCHEDULED': {
                hist.status = HistoryStatus.Scheduled;
            }
            default: {
                hist.status = hist.gradeAwarded ? HistoryStatus.Completed : HistoryStatus.InProgress;
            }
        }

       return hist;
    }

    /**
     * Each element in batch is an array of records for one student.
     */
    async processBatch(batch: IHistoryRow[][]) {
        const batchPromises: Promise<IStudentRecordSummary>[] = [];
        const updatePlanPromises: Promise<void>[] = [];

        const flatHistories = _.flatten(batch);
        await this.loadCatalogCredits(flatHistories);

        console.log(`processing batch of ${batch.length} students in parallel`);

        for (const studentCourses of batch) {
            // each element in batch is for one student
            const studentId = studentCourses[0].studentId.toString();
            const highschoolId = studentCourses[0].schoolId;

            let scope = this.scope;
            if (!scope && highschoolId) {
                scope = `naviance.${highschoolId}`;
            }
            if (!scope) {
                console.log(`could not find scope for student ${studentId}`);
                this.errorCount += 1;
                continue;
            }

            const {completeByKey, incompleteByKey, plannedByKey} =
                this.categorizeCourseHistoryRowsByStatus(studentCourses);

            let deDuplicatedCourses = Object.values(completeByKey);
            // get rid of incomplete when there's same but completed
            deDuplicatedCourses = deDuplicatedCourses
                .concat(Object.values(incompleteByKey)
                .filter((hist) => !completeByKey[StudentHistory.courseHistoryRecordKey(hist)]));

            // turn history rows into course records
            const courses: ICourseRecord[] = deDuplicatedCourses
                .map((rec) => (this.createCourseRecord(rec)))
                .filter((stuRec) => stuRec.number && stuRec.number.length > 0);

            try {
                batchPromises.push(PlanContext.createOrUpdateStudentRecords(
                    studentId,
                    'migration',
                    scope,
                    {},
                    courses,
                    this.updatePlans,
                    this.attachContextsIfNeeded,
                    true
                ));
            } catch (err) {
                console.log(`Error updating history records for ${studentId}`);
                this.errorCount += 1;
            }
            const plannedFromCourseHistory = Object.values(plannedByKey);
            if (plannedFromCourseHistory.length > 0) {
                updatePlanPromises.push(
                    this.findAndUpdateActivePlanPlannedCourses(studentId, plannedFromCourseHistory));
                console.log(`Update active plan ${studentId} ${JSON.stringify(plannedFromCourseHistory)}`);

            }
        }

        console.log(`waiting on ${batchPromises.length}`);
        const results = await Promise.all(batchPromises);
        if (updatePlanPromises.length > 0) {
            await Promise.all(updatePlanPromises); // atm typescript disallows waiting on different types of promises
        }
        console.log('finished waiting on promises');
        for (const result of results) {
            if (result.created) {
                this.createdCount += 1;
            }
            if (result.updated) {
                this.updatedCount += 1;
            }
        }

        return;
    }
    public async findAndUpdateActivePlanPlannedCourses(studentId: string, historyRows: IHistoryRow[]) {
        const plan = await this.findActivePlanThatHaveNoCourses(studentId);
        if (plan) {
            await this.updateActivePlan(plan, historyRows);
        }
    }

    public async updateActivePlan(studentPlan: StudentPlan, historyRows: IHistoryRow[]) {
        for (const historyRow of historyRows) {
            const plannedCourse = new PlannedCourse({
                number: historyRow.courseId,
                unique: historyRow.courseId,
                credits: this.catalogCredits(historyRow.courseId),
                gradeLevel: historyRow.gradeLevel
            });
            studentPlan.addCourse(plannedCourse);
        }
        await studentPlan.save();
    }

    public async findActivePlanThatHaveNoCourses(
        studentId: string
    ): Promise<StudentPlan | null> {
        const slimPlansPager = StudentPlan.find(this.scope, {
            findCriteria: {
                studentPrincipleId: studentId,
                meta: {
                    isActive: true,
                },
            },
            expand: "courses"
        });
        const slimPlans = await slimPlansPager.page(1);
        if (slimPlans.length <= 0) {
            return null;
        }
        if (slimPlans.length > 1) {
            console.log(`More than one active plans for ${this.scope} ${studentId}`);

        }

        const foundSlimPlan = slimPlans[0];
        if (!foundSlimPlan.courses) {
            console.log(`.courses not in ${this.scope} ${studentId}`);

            return null;
        }

        if (foundSlimPlan.courses.length > 0) {
            return null;
        }

        return foundSlimPlan.toStudentPlan();
    }

    public catalogCredits(courseId: string): number {
        const course = this.courseById[courseId];
        if (course) {
            return parseFloat(course.annotations.getValue('credits') as string);
        }

        return 0;
    }

    public createCourseRecord(rec: IHistoryRow) {
        return {
            number: rec.courseId,
            unique: rec.courseId,
            credits: rec.creditEarned === undefined && rec.status === HistoryStatus.Completed
                ? 0 // preserve the behavior of not using catalog credits in this case
                : rec.creditEarned || 0,
            attemptedCredits: rec.creditAttempted,
            gradeLevel: rec.gradeLevel,
            termId: rec.term,
            grade: rec.gradeAwarded || undefined,
            score: rec.score,
            status: rec.status,
            teacherName: rec.teacherName,
            courseName: rec.courseName,
            courseSubject: rec.courseSubject
        };
    }

    public static courseHistoryRecordKey(hist: IHistoryRow): string {
        return `${hist.courseId}_${hist.gradeLevel}_${hist.term}`;
    }

    public categorizeCourseHistoryRowsByStatus(
        studentCourses: IHistoryRow[]
    ) {
        const completeByKey: { [key: string]: IHistoryRow } = {};
        const incompleteByKey: { [key: string]: IHistoryRow } = {};
        const plannedByKey: { [key: string]: IHistoryRow } = {};

        for (const stuCourse of studentCourses) {
            const key = StudentHistory.courseHistoryRecordKey(stuCourse);
            if (stuCourse.status && stuCourse.status.toUpperCase() === 'COMPLETED') {
                completeByKey[key] = stuCourse;
                console.log(`COMPLETED: ${JSON.stringify(stuCourse)}`);

            } else if (stuCourse.status && stuCourse.status.toUpperCase() === 'PLANNED') {
                plannedByKey[key] = stuCourse;
                console.log(`PLANNED: ${JSON.stringify(stuCourse)}`);
            } else {
                incompleteByKey[key] = stuCourse;
                console.log(`OTHERWISE: ${JSON.stringify(stuCourse)}`);

            }
        }

        return {completeByKey, incompleteByKey, plannedByKey};
    }

    private attachStudentInfo(record: IHistoryRow): IHistoryRow | null {
        const sisId = record.studentId;
        const activeStudents = (this.studentIdMap[sisId] || []).filter((student) => student.isActive);
        const inactiveStudents = (this.studentIdMap[sisId] || []).filter((student) => !student.isActive);

        let foundStudent: IBasicNavianceStudent | null = null;
        if (activeStudents.length === 1) {
            foundStudent =  activeStudents[0];

        } else if (inactiveStudents.length === 1) {
            foundStudent = inactiveStudents[0];
        }

        if (foundStudent) {
            if (foundStudent.id) {
                console.log(`Overwriting studentId from sisId ${record.studentId} to ${foundStudent.id} `);
                record.studentId = foundStudent.id.toString();
            }
            if (foundStudent.highschoolId && !record.schoolId) {
                record.schoolId = foundStudent.highschoolId;
                console.log(`Attaching schoolId ${foundStudent.highschoolId} to sisId ${record.studentId}`);
            }
            // original is returned as well as maybe attached highschoolId
        } else {
            this.errorCount += 1;
            console.log(`Student info not found for sisId ${record.studentId}`);

            return null;
        }

        return record;
    }

    async processRow(input: IRowProcessorInput) {
        if (input.index === 1) {
            return { outputs: {} };
        }

        if (input.name.toUpperCase().startsWith('STUDENTS')) {
            // load student ID mapping
            const student = JSON.parse(input.data['JSON_OBJECT']) as IBasicNavianceStudent;
            if (!this.studentIdMap[student.sisId]) {
                this.studentIdMap[student.sisId] = [student];
            } else {
                this.studentIdMap[student.sisId].push(student);
            }
        } else {
            // process history records
            let records = StudentHistory.parseHistoryRow(input.data);

            // have to lookup naviance student IDs for each record
            const recordsWithFoundStudents: IHistoryRow[] = [];
            for (const record of records) {
                const resultRec = this.attachStudentInfo(record);
                if (resultRec) {
                    recordsWithFoundStudents.push(resultRec);
                }
            }
            if (records.length > 0) {
                console.log(`first history record ${JSON.stringify(records[0])}`);
            }

            records = recordsWithFoundStudents;

            for (const record of records) {
                if (!this.historyStudentId.length) {
                    this.historyStudentId = record.studentId;
                }
                if (this.historyStudentId !== record.studentId && this.historyForStudent.length) {
                    this.historyBatch.push([...this.historyForStudent]);
                    this.historyForStudent = [];
                    this.historyStudentId = record.studentId;

                    if (this.historyBatch.length >= this.batchSize) {
                        await this.processBatch(this.historyBatch);
                        console.log(`Processed batch of ${this.historyBatch.length} students`);
                        this.historyBatch = [];
                    }
                }
                this.historyForStudent.push(record);

                if (record.schoolId) {
                  if (this.processedStudentIdMap[record.schoolId]) {
                    this.processedStudentIdMap[record.schoolId].push(record.studentId);
                  } else {
                    this.processedStudentIdMap[record.schoolId] = [record.studentId];
                  }
                }
            }
        }
    }

    async processLeftovers() {
        if (this.historyForStudent.length) {
            this.historyBatch.push([...this.historyForStudent]);
        }
        if (this.historyBatch.length) {
            await this.processBatch(this.historyBatch);
            console.log(`Processed batch of ${this.historyBatch.length} students`);
        }
    }

    getProcessedStudentIdMap() {
      return this.processedStudentIdMap;
    }
}
