import {
    Namespace, PlanContext, PlannedCourse,
    Program, SlimStudentPlan, StudentPlan
} from "@academic-planner/apSDK";

export enum PlanImportStatus {
    Errored = "Errored",
    Updated = "Updated",
    Created = "Created"
}

export class PlanImport {

    static async allPrograms(namespace: string): Promise<Program[]> {
        return Program.find(new Namespace(namespace)).all();
    }

    static findProgram(name: string, programs: Program[]): Program | undefined {
        return programs.filter((p) => p.annotations.getValue('name') === name)[0];
    }

    static async batchImportPlan(scope: string, batch: any[], programs: Program[]): Promise<[number, number, number]> {
        const batchPromises: Promise<PlanImportStatus>[] = [];
        for (const planObj of batch) {
            batchPromises.push(this.importPlan(scope, planObj, programs));
        }
        let [creates, updates, errors] = [0, 0 , 0];
        const results = await Promise.all(batchPromises);
        for (const result of results) {
            switch (result) {
                case PlanImportStatus.Created:
                    creates += 1;
                    break;
                case PlanImportStatus.Errored:
                    errors += 1;
                    break;
                case PlanImportStatus.Updated:
                    updates += 1;
                    break;
            }
        }

        return [creates, updates, errors];
    }

    static async importPlan(scope: string, planObj: any, programs: Program[]): Promise<PlanImportStatus> {
        const pos = this.findProgram(planObj.planOfStudy.name, programs);
        if (!pos) {
            console.log(`Could not find program ${planObj.planOfStudy.name}`);

            return PlanImportStatus.Errored;
        }

        const approvalStatusMap = {
            APPROVAL_STATUS_NOT_SUBMITTED: 'In Progress',
            APPROVAL_STATUS_SUBMITTED: 'Submitted',
            APPROVAL_STATUS_PENDING: 'Awaiting School Approval',
            APPROVAL_STATUS_APPROVED: 'Approved',
            APPROVAL_STATUS_REJECTED: 'In Progress',
            APPROVAL_STATUS_AWAITING_PARENT: 'Awaiting Parent Approval',
            APPROVAL_STATUS_PARENT_APPROVED: 'Approved by Parent',
            APPROVAL_STATUS_PARENT_REJECTED: 'Not Approved By Parent',
            APPROVAL_STATUS_SCHOOL_APPROVED: 'Approved by school',
            APPROVAL_STATUS_SCHOOL_REJECTED: 'Not Approved By School'
        };

        const name = planObj.label;
        const migratedId = planObj.id;
        const status = approvalStatusMap[planObj.approvalStatus] || 'In Progress';
        const isActive = planObj.type === 'TYPE_HIGH_SCHOOL_OFFICIAL';
        const schoolId = planObj.planOfStudy.institutionId;
        const studentId = planObj.studentId.toString();

        const existingForStudent = await StudentPlan.find(scope, {
            findCriteria: {
                studentPrincipleId: studentId
            }
        }).all();

        console.log(`found ${existingForStudent.length} existing plans for ${studentId}, looking for name ${name}`);

        let existing: StudentPlan | undefined;
        for (const existPlan of existingForStudent) {
            if (existPlan.meta && existPlan.meta['name'] === name && existPlan.meta['migratedId'] === migratedId) {
                console.log(`found name match, updating existing plan`);
                existing = await existPlan.toStudentPlan();
                break;
            }
        }

        const stmtIdxByName: { [name: string]: number } = {};
        for (const [idx, stmt] of pos.statements.entries()) {
            if (stmt.annotations && stmt.annotations.getValue('name')) {
                stmtIdxByName[stmt.annotations.getValue('name') as string] = idx;
            }
        }

        const courses: PlannedCourse[] = [];
        for (const req of planObj.requirements) {
            let statementUnique = '';
            if (req.name && stmtIdxByName[req.name] !== undefined) {
                statementUnique = `${pos.name}_stmt${stmtIdxByName[req.name]}_take`;
            }

            const reqCourses = req.courses || [];
            for (const course of reqCourses) {
                if (!course.id) {
                    continue;
                }
                courses.push(new PlannedCourse({
                    number: course.id,
                    unique: course.id,
                    credits: course.credits,
                    gradeLevel: course.gradeYear,
                    // numericGrade: course.gradeYear,
                    statementUnique
                }));
            }
        }

        const meta = {
            name, status, isActive, schoolId, lastEdited: new Date().getTime(), migratedId
        };

        const context = new PlanContext(
            [],
            {
                buildAlgorithm: "AuditOnly",
                allowOverage: true
            },
            meta,
            scope,
            undefined,
            studentId
        );

        let plan: StudentPlan;
        let importStatus = PlanImportStatus.Created;
        if (existing) {
            plan = existing;
            const isSafe = plan.authorPrincipleId === 'migration';
            if (isSafe) {
                plan.contexts = [context];
                plan.courses = courses;
                plan.meta = meta;
                plan.programs = [pos];
                plan.authorPrincipleId = 'migration';
                await plan.save();
                console.log(`updated ${plan.guid} - migrated from ${migratedId}`);
                importStatus = PlanImportStatus.Updated;
            } else {
                console.log(`skipping unsafe update ${plan.guid} - migrated from ${migratedId}`);
            }
        } else {
            plan = new StudentPlan(
                studentId,
                'migration',
                scope,
                [ context ],
                [pos],
                courses,
                meta
            );
            const saved = await plan.save();
            console.log(`created ${saved.guid} - migrated from ${migratedId}`);
        }

        return importStatus;
    }
}
