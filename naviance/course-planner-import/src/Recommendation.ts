import { IRemarkCreate, RemarkType } from "@academic-planner/academic-planner-common";
import { Course, Namespace, Remark } from "@academic-planner/apSDK";
import { IRowData } from "@data-channels/dcSDK";
import { getRowVal } from "./Utils";

export interface IRecommendationRow {
    studentId: number | string;
    staffId: number | string;
    academicYear: number;
    dateCreated: string;
    studentClassYear: number;
    courseId: string;
}

export class StudentRecommendation {
    private courseGuidById: { [id: string]: string} = {};
    private courseIdByGuid: { [guid: string]: string} = {};
    private namespace: Namespace;

    constructor(namespace: string, private scope: string) {
        this.namespace = new Namespace(namespace);
    }

    private async loadCourseGuids(courseIds: string[]) {
        const idsNeeded = courseIds.filter((id) => !this.courseGuidById[id]);
        if (idsNeeded.length) {
            const pager = Course.find(this.namespace, {
                findCriteria: {
                    name: { operator: 'in', name: idsNeeded }
                }
            });
            const allCourses = await pager.all();
            for (const course of allCourses) {
                this.courseIdByGuid[course.guid!] = course.name;
                this.courseGuidById[course.name] = course.guid!;
            }
        }
    }

    public async processBatch(batch: IRecommendationRow[]): Promise<[number, number, number]> {
        let [skipped, found, created] = [0, 0, 0];
        const existingPager = Remark.findByStudentNames({findCriteria: {
            scope: this.scope,
            students: batch.map((recRow) => ({studentPrincipleId: recRow.studentId.toString(), studentName: 'foo'}))
        }});
        const existingForStudents = await existingPager.all();

        console.log(`found ${existingForStudents.length} existing remarks for batch`);

        await this.loadCourseGuids(batch.map((recRow) => recRow.courseId));

        const newNeeded: IRemarkCreate[] = [];

        for (const row of batch) {
            const guid = this.courseGuidById[row.courseId];
            if (!guid) {
                console.log(`could not find guid for courseId ${row.courseId}`);
                skipped += 1;
                continue;
            }
            let existing: Remark | null = null;
            for (const exist of existingForStudents) {
                if (exist.studentPrincipleId === row.studentId.toString() &&
                    exist.staffPrincipleId === row.staffId.toString() &&
                    exist.targetId === guid) {
                    existing = exist;
                    found += 1;
                    break;
                }
            }
            if (!existing) {
                newNeeded.push({
                    scope: this.scope,
                    staffPrincipleId: row.staffId.toString(),
                    studentPrincipleId: row.studentId.toString(),
                    targetId: guid,
                    remarkType: RemarkType.CourseRecommendation,
                    meta: {
                        academicYear: row.academicYear,
                        classYear: row.studentClassYear,
                        dateCreated: row.dateCreated,
                        source: 'migration'
                    }

                });
                created += 1;
            }
        }

        if (newNeeded.length) {
            await Remark.batchCreate(newNeeded);
        }

        return [skipped, found, created];
    }

    public static parseRow(data: IRowData): IRecommendationRow | undefined {
        if (data['JSON_OBJECT']) {
            try {
                return JSON.parse(data['JSON_OBJECT']);
            } catch (err) {
                console.log(`Error parsing recommendation json row`);

                return undefined;
            }
        } else {
            return {
                studentId: getRowVal(data, 'Student_ID') || '',
                staffId: getRowVal(data, 'Staff_ID') || '',
                academicYear: parseInt(getRowVal(data, 'Academic_Year') || '0'),
                dateCreated: new Date().toISOString(),
                studentClassYear: parseInt(getRowVal(data, 'Student_Class_Year') || '0'),
                courseId: getRowVal(data, 'Course_ID') || ''
            };
        }
    }
}
