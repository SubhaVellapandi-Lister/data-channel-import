import { Namespace, PlanningEngine, Program, RulesRepository, StudentPlan } from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IRowProcessorInput,
    IRowProcessorOutput
} from "@data-channels/dcSDK";

export class PlanExportProcessor extends BaseProcessor {
    private headers = [
        'Naviance_School_ID',
        'GUID',
        'Student_ID',
        'Author_ID',
        'Created_Date',
        'Updated_Date',
        'Approval_Date',
        'Plan_Of_Study_Name',
        'Cluster_Name',
        'Pathway_Name',
        'Num_Requirements_Met',
        'Num_Requirements_Total',
        'Requirements_All_Met',
        'Required_Credits_Total',
        'Required_Credits_Remaining',
        'Completed_Credits',
        'Planned_Credits',
        'Planned_Courses'
    ];
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

    private async findProgramNames(plan: StudentPlan): Promise<object> {
        const progNames = {
            Plan_Of_Study_Name: '',
            Cluster_Name: '',
            Pathway_Name: ''
        };
        const namespace = new Namespace(plan.scope.replace('namespace.', ''));
        for (const progRef of plan.programs) {
            const program = await this.findProgram(namespace, progRef.name);
            const progName = (program.annotations.getValue('name') || '').toString();
            const clusterId = program.annotations.getValue('clusterId');
            if (clusterId) {
                const clusterProgram = await this.findProgram(namespace, clusterId as string);
                progNames.Cluster_Name = (clusterProgram.annotations.getValue('name') || '').toString();
                progNames.Pathway_Name = progName;
            } else {
                progNames.Plan_Of_Study_Name = progName;
            }
        }

        return progNames;
    }

    public async export(input: IFileProcessorInput): Promise<IFileProcessorOutput> {

        RulesRepository.init({
            url: input.parameters!['rulesRepoUrl'],
            jwt: input.parameters!['JWT'],
            product: input.parameters!['rulesRepoProduct']
        });

        PlanningEngine.init({
            url: input.parameters!['planningUrl'],
            jwt: input.parameters!['JWT']
        });

        this.writeOutputRow(input.outputs['CoursePlans'].writeStream, this.headers);
        let plansExported = 0;

        for (const schoolId of input.parameters!['schools']) {
            this.programsByName = {};
            const pager = StudentPlan.find(`naviance.${schoolId}`);

            let page = await pager.page(1);

            while (page.length) {
                const pageOfPlans = page.map(async (slim) => ({slim, full: await slim.toStudentPlan()}));
                for await (const planSet of pageOfPlans) {
                    plansExported += 1;

                    const planVersion = planSet.full.latestVersion();
                    const audit = planSet.full.latestAudit;

                    const rowData = {
                        Naviance_School_ID: schoolId,
                        GUID: planSet.slim.guid,
                        Student_ID:  planSet.slim.studentPrincipleId,
                        Author_ID:  planSet.slim.authorPrincipleId,
                        Created_Date: planSet.slim.created.toISOString(),
                        Updated_Date: planVersion.created,
                        Approval_Date: '',
                        Num_Requirements_Met: audit.progress.statementsMet.toString(),
                        Num_Requirements_Total: audit.progress.statementsTotal.toString(),
                        Requirements_All_Met:
                            (audit.progress.statementsMet === audit.progress.statementsTotal).toString(),
                        Required_Credits_Total: audit.progress.creditsRequired.toString(),
                        Required_Credits_Remaining: audit.progress.creditsRemaining.toString(),
                        Completed_Credits: audit.progress.creditsCompleted.toString(),
                        Planned_Credits: audit.progress.creditsInPlan.toString(),
                        Planned_Courses: planVersion.courses.map((course) => course.number).join(', ')
                    };

                    Object.assign(rowData, await this.findProgramNames(planSet.full));

                    const flatRow = this.headers.map((headerName) => (rowData[headerName] || '').toString());

                    this.writeOutputRow(input.outputs['CoursePlans'].writeStream, flatRow);
                    console.log(flatRow);
                }
                page = await pager.next();
            }
        }

        return {
            results: {
                plansExported
            }
        };
    }
}
