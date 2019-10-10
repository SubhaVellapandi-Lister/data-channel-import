import { Namespace, PlanningEngine, Program, RulesRepository, StudentPlan } from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { getSchools } from "./Schools";

export class PlanExportProcessor extends BaseProcessor {
    private headers = [
        'Naviance_School_ID',
        'GUID',
        'Plan_Name',
        'Student_ID',
        'Author_ID',
        'Created_Date',
        'Updated_Date',
        'Approval_Date',
        'Status',
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
        'Completed_Credits',
        'Planned_Credits',
        'Planned_Courses'
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
        const progNames = {
            Plan_Of_Study_Name: '',
            Plan_Of_Study_ID: '',
            Plan_Of_Study_Is_Published: '',
            Cluster_Name: '',
            Cluster_ID: '',
            Pathway_Name: '',
            Pathway_ID: '',
            Pathway_Is_Published: ''
        };
        const namespace = new Namespace(plan.scope.replace('namespace.', ''));
        for (const progRef of plan.programs) {
            const program = await this.findProgram(namespace, progRef.name);
            const progName = (program.annotations.getValue('name') || '').toString();
            const progId = program.guid!;
            const clusterId = program.annotations.getValue('clusterId');
            const published = program.annotations.getValue('published');
            if (clusterId) {
                const clusterProgram = await this.findProgram(namespace, clusterId as string);
                progNames.Cluster_Name = (clusterProgram.annotations.getValue('name') || '').toString();
                progNames.Cluster_ID = clusterProgram.guid!;
                progNames.Pathway_Name = progName;
                progNames.Pathway_ID = progId;
                progNames.Pathway_Is_Published = published ? 'TRUE' : 'FALSE';
            } else {
                progNames.Plan_Of_Study_Name = progName;
                progNames.Plan_Of_Study_ID = progId;
                progNames.Plan_Of_Study_Is_Published = published ? 'TRUE' : 'FALSE';
            }
        }

        return progNames;
    }

    public async findSchools(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        RulesRepository.init({
            url: input.parameters!['rulesRepoUrl'],
            jwt: input.parameters!['JWT'],
            product: input.parameters!['rulesRepoProduct']
        });
        const schools = await getSchools(input.parameters!['rulesRepoUrl'], input.parameters!['JWT']);

        return {
            results: {
                schools
            }
        };
    }

    public async before_export(input: IStepBeforeInput) {
        RulesRepository.init({
            url: input.parameters!['rulesRepoUrl'],
            jwt: input.parameters!['JWT'],
            product: input.parameters!['rulesRepoProduct']
        });

        PlanningEngine.init({
            url: input.parameters!['planningUrl'],
            jwt: input.parameters!['JWT']
        });
    }

    public async export(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        const schoolId = Object.keys(input.outputs)[0];

        this.writeOutputRow(input.outputs[schoolId].writeStream, this.headers);
        let plansExported = 0;

        console.log(`processing school ${schoolId}`);
        this.programsByName = {};
        const pager = StudentPlan.find(`naviance.${schoolId}`);

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
                let planName = '';
                let planStatus = '';
                let isActive = '';
                for (const ctx of planVersion.contexts) {
                    if (ctx.product['name']) {
                        planName = ctx.product['name'];
                    }
                    if (ctx.product['status']) {
                        planStatus = ctx.product['status'];
                    }
                    if (ctx.product['isActive']) {
                        isActive = ctx.product['isActive'].toString();
                    }
                }

                const rowData = {
                    Naviance_School_ID: schoolId,
                    GUID: planSet.slim.guid,
                    Plan_Name: planName,
                    Student_ID:  planSet.slim.studentPrincipleId,
                    Author_ID:  planSet.slim.authorPrincipleId,
                    Created_Date: planSet.slim.created.toISOString(),
                    Updated_Date: planVersion.created,
                    Status: planStatus,
                    Is_Active: isActive,
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

                Object.assign(rowData, await this.findProgramColumns(planSet.full));

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

    public async after_export(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        return { results: {
            plansExported: this.plansExported
        }};
    }
}
