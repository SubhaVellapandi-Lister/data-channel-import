import { ICourseRecord } from "@academic-planner/academic-planner-common";
import {
    Namespace, Program,
    RawStorage, StudentPlan
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { initServices } from "./Utils";

export class PlanExportProcessor extends BaseProcessor {
    private headers = [
        'Tenant_ID',
        'GUID',
        'Plan_Name',
        'Student_ID',
        'Author_ID',
        'Created_Date',
        'Updated_Date',
        'Status',
        'Approval_Requirement',
        'Pathway_Label',
        'Cluster_Label',
        'Is_Active',
        'Plan_Of_Study_Name',
        'Plan_Of_Study_ID',
        'Plan_Of_Study_Is_Published',
        'Cluster_Name',
        'Cluster_ID',
        'Pathway_Name',
        'Pathway_ID',
        'Pathway_Is_Published',
        'Num_Requirements_Met',
        'Num_Requirements_Total',
        'Requirements_All_Met',
        'Required_Credits_Total',
        'Required_Credits_Remaining',
        'Credit_Deficiency',
        'Completed_Credits',
        'Completed_Credits_Used',
        'Planned_Credits',
        'Planned_Credits_Used',
        'PoS_Num_Requirements_Met',
        'PoS_Num_Requirements_Total',
        'PoS_Requirements_All_Met',
        'PoS_Required_Credits_Total',
        'PoS_Required_Credits_Remaining',
        'PoS_Credit_Deficiency',
        'PoS_Completed_Credits',
        'PoS_Completed_Credits_Used',
        'PoS_Planned_Credits',
        'PoS_Planned_Credits_Used',
        'Pathway_Num_Requirements_Met',
        'Pathway_Num_Requirements_Total',
        'Pathway_Requirements_All_Met',
        'Pathway_Required_Credits_Total',
        'Pathway_Required_Credits_Remaining',
        'Pathway_Credit_Deficiency',
        'Pathway_Completed_Credits',
        'Pathway_Completed_Credits_Used',
        'Pathway_Planned_Credits',
        'Pathway_Planned_Credits_Used',
        'Planned_Courses',
        'Completed_Courses'
    ];
    private plansExported: { [schoolId: string]: number } = {};
    private programsByName: { [name: string]: Program } = {};

    private async findProgram(namespace: Namespace, name: string): Promise<Program> {
        if (!this.programsByName[name]) {
            const fullProg = await Program.findOne({
                namespace, itemName: name
            });
            this.programsByName[name] = fullProg!;
        }

        return this.programsByName[name];
    }

    private async findProgramColumns(plan: StudentPlan): Promise<object> {
        const audit = plan.latestAudit;
        const gradedRecIds: string[] = audit.studentRecords
            .filter((srec) => (srec.record as ICourseRecord).grade !== undefined)
            .map((srec) => srec.identifier);
        let foundClusterId = '';
        const progNames = {
            Plan_Of_Study_Name: '',
            Plan_Of_Study_ID: '',
            Plan_Of_Study_Is_Published: '',
            Cluster_Name: '',
            Cluster_ID: '',
            Pathway_Name: '',
            Pathway_ID: '',
            Pathway_Is_Published: '',
            Num_Requirements_Met: audit.progress.statementsMet.toString(),
            Num_Requirements_Total: audit.progress.statementsTotal.toString(),
            Requirements_All_Met: (audit.progress.statementsMet === audit.progress.statementsTotal).toString(),
            Required_Credits_Total: audit.progress.creditsRequired.toString(),
            Required_Credits_Remaining: audit.progress.creditsRemaining.toString(),
            PoS_Num_Requirements_Met: '',
            PoS_Num_Requirements_Total: '',
            PoS_Requirements_All_Met: '',
            PoS_Required_Credits_Total: '',
            PoS_Required_Credits_Remaining: '',
            PoS_Credit_Deficiency: 'FALSE',
            PoS_Completed_Credits_Used: '',
            PoS_Planned_Credits_Used: '',
            PoS_Completed_Credits: "0", // need to tweak once we are storing course histories
            PoS_Planned_Credits: '',
            Pathway_Num_Requirements_Met: '',
            Pathway_Num_Requirements_Total: '',
            Pathway_Requirements_All_Met: '',
            Pathway_Required_Credits_Total: '',
            Pathway_Required_Credits_Remaining: '',
            Pathway_Credit_Deficiency: 'FALSE',
            Pathway_Completed_Credits_Used: '',
            Pathway_Planned_Credits_Used: '',
            Pathway_Completed_Credits: "0", // need to tweak once we are storing course histories
            Pathway_Planned_Credits: ''
        };
        const namespace = new Namespace(plan.scope.replace('namespace.', ''));
        let planTotalCreditsRequired = 0;
        for (const progRef of plan.programs) {
            const program = await this.findProgram(namespace, progRef.name);
            const progName = (program.annotations.getValue('name') || '').toString();
            const rawAudit = audit.rawAudit.programs.filter((progDet) => progDet.program.name === program.name)[0];
            if (!rawAudit) {
                continue;
            }
            const statements = rawAudit.program.statements;
            let statementsMet = 0;
            let creditsTotal = 0;
            for (const stmt of statements) {
                if (stmt.auditResult.isMet) {
                    statementsMet += 1;
                }
                let foundAnnoCreds = false;
                if (stmt.with) {
                    for (const withItem of stmt.with) {
                        if (withItem.name === 'credits' && withItem.value) {
                            const credits = parseFloat(withItem.value.toString());
                            if (credits) {
                                creditsTotal += credits;
                            }
                            foundAnnoCreds = true;
                            break;
                        }
                    }
                }
                if (!foundAnnoCreds) {
                    creditsTotal += stmt.auditResult.creditProgress.creditsRequired;
                }
            }
            planTotalCreditsRequired += creditsTotal;
            const progId = program.guid!;
            const clusterId = program.annotations.getValue('clusterId');
            const published = program.annotations.getValue('published');
            const plannedCredits = rawAudit.program.auditResult.usedRecords
                .filter((rec) => !gradedRecIds[rec.studentRecordId])
                .map((rec) => rec.creditsUsed)
                .reduce((credA, credB) => credA + credB, 0);
            const completedCredits = rawAudit.program.auditResult.usedRecords
                .filter((rec) => gradedRecIds[rec.studentRecordId])
                .map((rec) => rec.creditsUsed)
                .reduce((credA, credB) => credA + credB, 0);

            if (clusterId) {
                foundClusterId = clusterId as string;
                progNames.Pathway_Name = progName;
                progNames.Pathway_ID = progId;
                progNames.Pathway_Is_Published = this.booleanToString(published);
                progNames.Pathway_Num_Requirements_Met = statementsMet.toString();
                progNames.Pathway_Num_Requirements_Total = statements.length.toString();
                progNames.Pathway_Required_Credits_Remaining = audit.progress.creditsRemaining.toString();
                progNames.Pathway_Required_Credits_Total = creditsTotal.toString();
                progNames.Pathway_Requirements_All_Met = this.booleanToString(statements.length === statementsMet);
                progNames.Pathway_Completed_Credits_Used = rawAudit.progress.credits.creditsGradedUsed.toString();
                progNames.Pathway_Completed_Credits = completedCredits.toString();
                progNames.Pathway_Planned_Credits_Used = rawAudit.progress.credits.creditsPlannedUsed.toString();
                progNames.Pathway_Planned_Credits = plannedCredits.toString();
            } else {
                progNames.Plan_Of_Study_Name = progName;
                progNames.Plan_Of_Study_ID = progId;
                progNames.Plan_Of_Study_Is_Published = this.booleanToString(published);
                progNames.PoS_Num_Requirements_Met = statementsMet.toString();
                progNames.PoS_Num_Requirements_Total = statements.length.toString();
                progNames.PoS_Required_Credits_Remaining = audit.progress.creditsRemaining.toString();
                progNames.PoS_Required_Credits_Total = creditsTotal.toString();
                progNames.PoS_Requirements_All_Met = this.booleanToString(statements.length === statementsMet);
                progNames.PoS_Completed_Credits_Used = rawAudit.progress.credits.creditsGradedUsed.toString();
                progNames.PoS_Completed_Credits = completedCredits.toString();
                progNames.PoS_Planned_Credits_Used = rawAudit.progress.credits.creditsPlannedUsed.toString();
                progNames.PoS_Planned_Credits = plannedCredits.toString();
            }
        }

        progNames.Required_Credits_Total = planTotalCreditsRequired.toString();

        if (!foundClusterId && plan.meta) {
            foundClusterId = plan.meta['clusterId'] as string;
        }

        if (foundClusterId) {
            const clusterProgram = await this.findProgram(namespace, foundClusterId);
            progNames.Cluster_Name = (clusterProgram.annotations.getValue('name') || '').toString();
            progNames.Cluster_ID = clusterProgram.guid!;
        }

        return progNames;
    }

    private booleanToString(item: any) {
        return item ? 'TRUE' : 'FALSE';
    }

    public async before_exportPlans(input: IStepBeforeInput) {
        initServices(input.parameters!);
    }

    public async exportPlans(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        const schoolId = Object.keys(input.outputs)[0];

        this.writeOutputRow(input.outputs[schoolId].writeStream, this.headers);
        let plansExported = 0;

        console.log(`processing school ${schoolId}`);
        this.programsByName = {};
        const pager = StudentPlan.find(`naviance.${schoolId}`);

        const namespace = new Namespace(schoolId);
        const config = await RawStorage.findOne({namespace, itemName: schoolId });
        let configItems: { [name: string]: string } = {};
        if (config && config.json) {
            configItems = {
                Approval_Requirement: config.json['approvalRequirement'] || '',
                Pathway_Label: config.json['labels']['pathway'] || '',
                Cluster_Label: config.json['labels']['cluster'] || ''
            };
        }

        let page = await pager.page(1);

        const sleep = (milliseconds: number) => {
            return new Promise((resolve) => setTimeout(resolve, milliseconds));
        };

        while (page.length) {
            const pageOfPlans = page.map(async (slim) => {
                let full: StudentPlan;
                let retries = 5;
                while (retries > 0) {
                    try {
                        full = await slim.toStudentPlan();
                        break;
                    } catch {
                        console.log(`ERROR GETTING FULL PLAN, RETRYING WITH ${retries} RETRIES...`);
                        await sleep(1000);
                        retries -= 1;
                    }
                }

                if (retries === 0) {
                    full = await slim.toStudentPlan();
                }

                return {slim, full: full!};
            });
            for await (const planSet of pageOfPlans) {
                plansExported += 1;

                const planVersion = planSet.full.latestVersion();
                const audit = planSet.full.latestAudit;
                const meta = planSet.full.meta || {};
                let planName =  meta['name'] || '';
                let planStatus = meta['status'] || '';
                let isActive = meta['isActive'] || '';
                for (const ctx of planVersion.contexts) {
                    if (!planName && ctx.product['name']) {
                        planName = ctx.product['name'];
                    }
                    if (!planStatus && ctx.product['status']) {
                        planStatus = ctx.product['status'];
                    }
                    if (isActive === '' && ctx.product['isActive']) {
                        isActive = ctx.product['isActive'].toString();
                    }
                }

                const plannedCreditTotal = audit.studentRecords
                    .map((rec) => (rec.record as ICourseRecord).credits)
                    .reduce((credA, credB) => credA + credB, 0);

                const rowData = {
                    Tenant_ID: schoolId,
                    GUID: planSet.slim.guid,
                    Plan_Name: planName,
                    Student_ID:  planSet.slim.studentPrincipleId,
                    Author_ID:  planSet.slim.authorPrincipleId,
                    Created_Date: planSet.slim.created.toISOString(),
                    Updated_Date: planVersion.created,
                    Status: planStatus,
                    Is_Active: isActive,
                    Credit_Deficiency: 'FALSE',
                    Completed_Credits_Used: audit.progress.creditsCompleted.toString(),
                    Planned_Credits_Used: audit.progress.creditsInPlan.toString(),
                    Completed_Credits: "0", // need to tweak once we are storing course histories
                    Planned_Credits: plannedCreditTotal.toString(),
                    Planned_Courses: planVersion.courses.map((course) => course.number).join(', '),
                    Course_History: '' // need to tweak once we are storing course histories
                };

                Object.assign(rowData, await this.findProgramColumns(planSet.full));
                Object.assign(rowData, configItems);

                const flatRow = this.headers.map((headerName) => (rowData[headerName] || '').toString());

                this.writeOutputRow(input.outputs[schoolId].writeStream, flatRow);
                console.log(`${schoolId} - ${planSet.slim.guid}`);
            }
            try {
                page = await pager.next();
            } catch {
                console.log('ERROR GETTING NEXT PAGE OF PLANS, RETRYING...');
                sleep(2000);
                page = await pager.next();
            }
        }

        this.plansExported[schoolId] = plansExported;

        return {};
    }

    public async after_exportPlans(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        return { results: {
            plansExported: this.plansExported
        }};
    }
}
