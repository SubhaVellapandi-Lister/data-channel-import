import { PlanningEngine, RulesRepository, StudentPlan } from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IRowProcessorInput,
    IRowProcessorOutput
} from "@data-channels/dcSDK";

export class PlanExportProcessor extends BaseProcessor {

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

        const headers = [
            'Student_ID',
            'Author_ID',
            'Created',
            'Programs',
            'Requirements_Met',
            'Requirements_Total',
            'Planned_Courses'
        ];
        this.writeOutputRow(input.outputs['RawCoursePlans'].writeStream, headers);

        const pager = StudentPlan.find('apCli');
        let page = await pager.page(1);
        let plansExported = 0;
        while (page.length) {
            for (const plan of page) {
                plansExported += 1;
                const fullPlan = await plan.toStudentPlan();
                const planData: string[] = [
                    plan.studentPrincipleId,
                    plan.authorPrincipleId,
                    plan.created.toISOString(),
                    fullPlan.programs.map((prog) => prog.name).join(', '),
                    fullPlan.latestAudit.progress.statementsMet.toString(),
                    fullPlan.latestAudit.progress.statementsTotal.toString(),
                    fullPlan.courses.map((course) => course.number).join(', ')
                ];

                this.writeOutputRow(input.outputs['RawCoursePlans'].writeStream, planData);
            }
            page = await pager.next();
        }

        return {
            results: {
                plansExported
            }
        };
    }

    public async calcIsMet(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        const colValue = input.index === 1 ? 'Is_Met' :
            input.data['Requirements_Met'] === input.data['Requirements_Total'];

        return {
            outputs: {
                ['CoursePlans']: input.raw.concat([colValue.toString()])
            }
        };
    }
}
