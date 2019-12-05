import { IStudentRecordSummary } from "@academic-planner/academic-planner-common";
import { PlanContext } from "@academic-planner/apSDK";

export class StudentHistory {
    public static createdCount = 0;
    public static updatedCount = 0;

    static async processBatch(namespace: string, batch: any[][]): Promise<[number, number]> {
        let createdCount = 0;
        let updatedCount = 0;
        const batchPromises: Promise<IStudentRecordSummary>[] = [];
        for (const studentCourses of batch) {
            const studentId = studentCourses[0].studentId.toString();
            const courses = studentCourses.map((rec) => ({
                number: rec.courseId,
                unique: rec.courseId,
                credits: rec.creditEarned || 0,
                gradeLevel: rec.gradeLevel,
                termId: rec.term,
                grade: rec.gradeAwarded || rec.score || undefined,
            })).filter((stuRec) => stuRec.number.length > 0);
            console.log(studentId);
            if (studentId === '36192153') {
                console.log(courses);
            }
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
