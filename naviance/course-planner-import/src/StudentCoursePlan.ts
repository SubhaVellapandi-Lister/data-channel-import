import {
    Namespace, PlanContext, PlannedCourse,
    Program, SlimStudentPlan, StudentPlan
} from "@academic-planner/apSDK";

import { sleep } from "./Utils";

export enum PlanImportStatus {
    Errored = "Errored",
    Updated = "Updated",
    Created = "Created",
    Skipped = "Skipped"
}

export class PlanImport {

    static async allPrograms(namespace: string): Promise<Program[]> {
        return Program.find(new Namespace(namespace)).all();
    }

    static findProgram(name: string, programs: Program[]): Program | undefined {
        return programs.filter((p) => p.annotations.getValue('name') === name)[0];
    }

    static async batchImportPlan(
        scope: string, batch: any[], programs: Program[], createOnly: boolean, planBatchDelay: number
    ): Promise<[number, number, number, number]> {
        const batchPromises: Promise<PlanImportStatus>[] = [];

        const batchAllExistingPager = StudentPlan.findByStudentNames({
            findCriteria : {
                isDeleted : false,
                scope,
                expand: 'meta',
                students: batch.map((planObj) => ({
                    studentPrincipleId: planObj.studentId.toString(),
                    studentName: ''
                }))
            }
        });

        const existingStartTime = new Date().getTime();
        const batchAllExisting = await batchAllExistingPager.all();
        const existingFindSeconds = (new Date().getTime() - existingStartTime) / 1000;
        console.log(
        `Found ${batchAllExisting.length} existing plans for ${batch.length} batch records in ${existingFindSeconds}`
        );

        const queueStartTime = new Date().getTime();
        for (const [idx, planObj] of batch.entries()) {
            if (idx && idx % 10 === 0) {
                // take quick sleep between batches of 10 to not overwhelm planning engine
                await sleep(planBatchDelay * 1000);
            }
            const studentId = planObj.studentId.toString();
            const existingPlans = batchAllExisting.filter((plan) => plan.studentPrincipleId === studentId);
            batchPromises.push(this.importPlan(scope, planObj, programs, createOnly, existingPlans));
        }
        const queueSeconds = (new Date().getTime() - queueStartTime) / 1000;
        console.log(`started promises in ${queueSeconds} seconds`);
        let creates = 0;
        let updates = 0;
        let errors = 0;
        let skips = 0;

        const awaitStartTime = new Date().getTime();
        const results = await Promise.all(batchPromises);
        const awaitSeconds = (new Date().getTime() - awaitStartTime) / 1000;
        console.log(`finished plans in ${awaitSeconds} seconds`);
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
                case PlanImportStatus.Skipped:
                    skips += 1;
                    break;
            }
        }
        console.log(`${creates} creates, ${updates} updates, ${errors} errors, ${skips} skips`);

        return [creates, updates, errors, skips];
    }

    static async importPlan(
        scope: string, planObj: any, programs: Program[], createOnly: boolean, existingForStudent: SlimStudentPlan[]
    ): Promise<PlanImportStatus> {
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
        let isActive = planObj.type === 'TYPE_HIGH_SCHOOL_OFFICIAL';
        const schoolId = planObj.planOfStudy.institutionId;
        const studentId = planObj.studentId.toString();

        console.log(`found ${existingForStudent.length} existing plans for ${studentId}, looking for name ${name}`);

        let existing: StudentPlan | undefined;
        const otherActivePlans: StudentPlan[] = [];
        for (const existPlan of existingForStudent) {
            const full = await existPlan.toStudentPlan();

            if (!existing && full.meta && full.meta['name'] === name && full.meta['migratedId'] === migratedId) {
                existing = full;
            } else if (full.meta && full.meta['isActive']) {
                otherActivePlans.push(full);
            }
        }

        let needsIsActiveUpdate = false;
        if (existing && existing.meta && existing.meta['isActive'] && otherActivePlans.length) {
            for (const otherPlan of otherActivePlans) {
                if (otherPlan.meta) {
                    if (!otherPlan.meta['migratedId'] ||
                        existing.meta['migratedId']! < otherPlan.meta['migratedId']) {
                        // UI created plan is active or other migrated plan is newer, so this plan should not be active
                        isActive = false;
                        needsIsActiveUpdate = true;
                        console.log(`marking ${existing.guid} inactive because other active plan exists`);
                    }
                }
            }
        }

        if (existing && createOnly && !needsIsActiveUpdate) {
            return PlanImportStatus.Skipped;
        }

        console.log(`found name match, updating existing plan`);

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
                try {
                    await plan.save();
                } catch (err) {
                    sleep(500);
                    await plan.save();
                }
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
            let guid = '';
            try {
                const saved = await plan.save();
                guid = saved.guid;
            } catch (err) {
                sleep(500);
                const saved = await plan.save();
                guid = saved.guid;
            }
            console.log(`created ${guid} - migrated from ${migratedId}`);
        }

        return importStatus;
    }
}
