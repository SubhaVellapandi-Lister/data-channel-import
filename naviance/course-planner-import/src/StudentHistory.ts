import { ICourseRecord, IStudentRecordSummary } from "@academic-planner/academic-planner-common";
import { Course, PlanContext } from "@academic-planner/apSDK";
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
    InProgress = 'In Progress'
}

export class StudentHistory {
    public createdCount = 0;
    public updatedCount = 0;
    public errorCount = 0;
    private studentIdMap: INavianceStudentIDMap = {};
    private historyStudentId = '';
    private historyForStudent: IHistoryRow[] = [];
    private historyBatch: IHistoryRow[][] = [];
    private courseById: { [id: string]: Course } = {};

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
            case 'SCHEDULED': {
                hist.status = HistoryStatus.Scheduled;
            }
            default: {
                hist.status = hist.gradeAwarded ? HistoryStatus.Completed : HistoryStatus.InProgress;
            }
        }

       return hist;
    }

    async processBatch(batch: IHistoryRow[][]) {
        const batchPromises: Promise<IStudentRecordSummary>[] = [];

        // const flatHistories = _.flatten(batch);
        // await this.loadCatalogCredits(flatHistories);

        console.log(`processing batch of ${batch.length} students in parallel`);

        for (const studentCourses of batch) {
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

            function histKey(hist: IHistoryRow): string {
                return `${hist.courseId}_${hist.gradeLevel}_${hist.term}`;
            }

            const completeByKey: { [key: string]: IHistoryRow } = {};
            const incompleteByKey: { [key: string]: IHistoryRow } = {};

            for (const stuCourse of studentCourses) {
                const key = histKey(stuCourse);
                if (stuCourse.status && stuCourse.status.toUpperCase() === 'COMPLETED') {
                    completeByKey[key] = stuCourse;
                } else {
                    incompleteByKey[key] = stuCourse;
                }
            }

            let deDuplicatedCourses = Object.values(completeByKey);
            deDuplicatedCourses = deDuplicatedCourses
                .concat(Object.values(incompleteByKey)
                .filter((hist) => !completeByKey[histKey(hist)]));

            const courseById = this.courseById;
            function catalogCredits(courseId: string): number {
                const course = courseById[courseId];
                if (course) {
                    return parseFloat(course.annotations.getValue('credits') as string);
                }

                return 0;
            }

            /*deDuplicatedCourses = deDuplicatedCourses.filter((hist) =>
                hist.status !== HistoryStatus.Completed || (hist.creditEarned && hist.creditEarned >= 0)
            );*/

            const courses: ICourseRecord[] = deDuplicatedCourses.map((rec) => ({
                number: rec.courseId,
                unique: rec.courseId,
                credits: rec.creditEarned === undefined && rec.status === HistoryStatus.Completed
                    ? catalogCredits(rec.courseId)
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
            })).filter((stuRec) => stuRec.number && stuRec.number.length > 0);

            // console.log(studentId, courses);

            try {
                batchPromises.push(PlanContext.createOrUpdateStudentRecords(
                    studentId,
                    'migration',
                    scope,
                    {},
                    courses,
                    this.updatePlans,
                    this.attachContextsIfNeeded
                ));
            } catch (err) {
                console.log(`Error updating history records for ${studentId}`);
                this.errorCount += 1;
            }
        }

        console.log(`waiting on ${batchPromises.length}`);
        const results = await Promise.all(batchPromises);
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
            record.studentId = foundStudent.id.toString();
            record.schoolId = foundStudent.highschoolId;
        } else {
            this.errorCount += 1;
            console.log(`Student info not found for ${record.studentId}`);

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

            const isMigration = input.data['JSON_OBJECT'] !== undefined && records.length === 1;

            if (!isMigration) {
                // have to lookup naviance student IDs for each record
                const recordsWithFoundStudents: IHistoryRow[] = [];
                for (const record of records) {
                    const resultRec = this.attachStudentInfo(record);
                    if (resultRec) {
                        recordsWithFoundStudents.push(resultRec);
                    }
                }
                records = recordsWithFoundStudents;
            }

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

    getStudentIds() {
      return this.historyForStudent.map((i) => i.studentId);
    }
}
