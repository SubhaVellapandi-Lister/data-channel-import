import { ICourseRecord, IStudentRecordSummary } from "@academic-planner/academic-planner-common";
import { PlanContext } from "@academic-planner/apSDK";
import { IRowData } from "@data-channels/dcSDK";
import { getRowVal } from "./Utils";

export interface IHistoryRow {
    studentId: string;
    courseId: string;
    creditEarned: number;
    gradeLevel: number;
    gradeAwarded?: string;
    term?: string;
    score?: number;
    status?: string;
    teacherName?: string;
    courseName?: string;
    courseSubject?: string;
}

export class StudentHistory {
    public static createdCount = 0;
    public static updatedCount = 0;

    static parseHistoryRow(rowData: IRowData): IHistoryRow {
        if (rowData['JSON_OBJECT']) {
            // migration record
            const rec = JSON.parse(rowData['JSON_OBJECT']);
            const studentId = rec.studentId.toString();

            return  {
                studentId,
                courseId: rec.courseId,
                creditEarned: rec.creditEarned || 0,
                gradeLevel: rec.gradeLevel,
                term: rec.term,
                gradeAwarded: rec.gradeAwarded || rec.score || undefined,
                score: rec.score,
                status: rec.status,
                teacherName: rec.teacher ? rec.teacher.fullName : undefined,
                courseName: rec.name,
                courseSubject: rec.subjectArea ? rec.subjectArea.name : ''
            };

        } else {
            // import record
            const gradeLevelStr = getRowVal(rowData, 'Grade_Level_Taken');
            const creditEarnedStr = getRowVal(rowData, 'Credits_Earned');
            const scoreStr = getRowVal(rowData, 'Score');

            return {
                studentId: getRowVal(rowData, 'Student_ID') || '',
                courseId: getRowVal(rowData, 'Course_ID') || '',
                gradeLevel: gradeLevelStr ? parseInt(gradeLevelStr) : 0,
                term: getRowVal(rowData, 'Term'),
                courseName: getRowVal(rowData, 'Course_Name'),
                teacherName: getRowVal(rowData, 'Teacher'),
                creditEarned: creditEarnedStr ? parseFloat(creditEarnedStr) : 0.0,
                gradeAwarded: getRowVal(rowData, 'Letter_Grade'),
                score: scoreStr ? parseFloat(scoreStr) : undefined,
                status: getRowVal(rowData, 'Course_Status')
            };
        }
    }

    static async processBatch(namespace: string, batch: IHistoryRow[][]): Promise<[number, number]> {
        let createdCount = 0;
        let updatedCount = 0;
        const batchPromises: Promise<IStudentRecordSummary>[] = [];
        for (const studentCourses of batch) {
            const studentId = studentCourses[0].studentId.toString();
            const courses: ICourseRecord[] = studentCourses.map((rec) => ({
                number: rec.courseId,
                unique: rec.courseId,
                credits: rec.creditEarned || 0,
                gradeLevel: rec.gradeLevel,
                termId: rec.term,
                grade: rec.gradeAwarded || undefined,
                score: rec.score,
                status: rec.status,
                teacherName: rec.teacherName,
                courseName: rec.courseName,
                courseSubject: rec.courseSubject
            })).filter((stuRec) => stuRec.number && stuRec.number.length > 0);

            batchPromises.push(PlanContext.createOrUpdateStudentRecords(
                studentId,
                'migration',
                namespace,
                {},
                courses
            ));
        }

        const results = await Promise.all(batchPromises);
        for (const result of results) {
            if (result.created) {
                createdCount += 1;
            }
            if (result.updated) {
                updatedCount += 1;
            }
        }

        return [createdCount, updatedCount];
    }
}
