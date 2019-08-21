import { AnnotationOperator, Annotations, AnnotationType, Batch,
    Course, IAnnotationItems, Namespace, PlanningEngine, RulesRepository } from "@academic-planner/apSDK";
import { BaseProcessor, IRowData, IFileProcessorInput, IFileProcessorOutput,
    IRowProcessorOutput, IStepAfterOutput, IStepBeforeInput } from "@data-channels/dcSDK";

export interface ITranslateConfig {
    headers: string[];
    mapping: {
        [name: string]: string;
    };
}

export class PlanExportProcessor extends BaseProcessor {
    private apBatchSize = 100;
    private apBatch: IRowData[] = [];
    private batchCount = 0;
    private duplicatesSkipped = 0;
    private coursesPushed = 0;
    private namespace = '';
    private originalHeaders: string[] = [];
    private seenCourseIds: { [key: string]: string } = {};
    private schoolsByCourse: { [key: string]: string[] } = {};
    private subjectAreaMapping: { [key: string]: string } = {};
    private instructionalLevelMap = {
        AP: 'Advanced Placement',
        BAS: 'Basic',
        EL: 'English Learner',
        DE: 'Dual Enrollment',
        GEN: 'General',
        GTAA: 'Gifted and Talented/Advanced Academic',
        HON: 'Honors Level',
        HSE: 'High School Equivalent',
        IB: 'International Baccalaureate',
        REM: 'Remedial',
        SWD: 'Students with Disabilities',
        UT: 'Untracked'
    };

    private async processBatch(): Promise<void> {
        this.batchCount += 1;
        const b = new Batch({namespace: new Namespace(this.namespace)});
        const courses: Course[] = [];
        for (const rowData of this.apBatch) {
            const credits = parseFloat(rowData['Credits']) || 0;
            const instructionalLevelCode = rowData['Instructional_Level'] || 'UT';
            const instructionalLevel = this.instructionalLevelMap[instructionalLevelCode] || 'Untracked';
            const statusCode = rowData['Status'] === 'Y' ? 'ACTIVE' : 'INACTIVE';
            const isCte = rowData['CTE'] === 'Y' ? 1 : 0;
            const isTechPrep = 0;
            const schoolsList = this.schoolsByCourse[rowData['Course_ID']] || [];
            const rowSub = rowData['Subject_Area'];
            const expandedSubjectArea =
                this.subjectAreaMapping[rowSub] ||
                this.subjectAreaMapping[rowSub.replace('/', '\\/')] ||
                'Basic Skills_Unknown';
            const grades: number[] = [];
            for (const g of [6, 7, 8, 9, 10, 11, 12]) {
                if (rowData[`GR${g}`] === 'Y') {
                    grades.push(g);
                }
            }
            if (this.seenCourseIds[rowData['Course_ID']]) {
                this.duplicatesSkipped += 1;
                continue;
            }
            this.seenCourseIds[rowData['Course_ID']] = rowData['Course_ID'];

            const annoItems: IAnnotationItems = {
                id: { value: rowData['Course_ID'], type: 'STRING', operator: AnnotationOperator.EQUALS },
                name: { value: rowData['Course_Name'], type: 'STRING', operator: AnnotationOperator.EQUALS },
                grades: { value: grades, type: 'LIST_INTEGER', operator: AnnotationOperator.EQUALS },
                status: { value: statusCode, type: 'STRING', operator: AnnotationOperator.EQUALS },
                credits: { value: credits, type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
                cteCourse: { value: isCte, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
                techPrepCourse: { value: isTechPrep, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
                stateCode: { value: rowData['State_ID'], type: 'STRING', operator: AnnotationOperator.EQUALS },
                stateId: { value: rowData['State_ID'], type: 'STRING', operator: AnnotationOperator.EQUALS },
                subjectArea: { value: expandedSubjectArea, type: 'STRING', operator: AnnotationOperator.EQUALS },
                instructionalLevel: { value: instructionalLevel, type: 'STRING', operator: AnnotationOperator.EQUALS },
                schools: { value: schoolsList, type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
                description: { value: rowData['Description'], type: 'STRING', operator: AnnotationOperator.EQUALS }
            };

            if (rowData['Elective']) {
                const isElective = rowData['Elective'] === 'Y' ? 1 : 0;
                annoItems['elective'] = { value: isElective, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS };
            }

            if (rowData['Max_Enroll']) {
                const maxEnroll = parseInt(rowData['Max_Enroll']);
                annoItems['maxEnroll'] = { value: maxEnroll, type: 'DECIMAL', operator: AnnotationOperator.EQUALS };
            }

            if (rowData['Course_Duration']) {
                annoItems['courseDuration'] = {
                    value: rowData['Course_Duration'], type: 'STRING', operator: AnnotationOperator.EQUALS
                };
            }

            courses.push(new Course(
                rowData['Course_ID'],
                rowData['Course_Name'],
                new Annotations(annoItems)
            ));
            this.coursesPushed += 1;
        }
        b.addItems(courses);
        await b.createOrUpdate();
        this.apBatch = [];
    }

    public async export(input: IStepBeforeInput) {

        this.namespace = input.parameters!['namespace'];

        RulesRepository.init({
            url: input.parameters!['rulesRepoUrl'],
            jwt: input.parameters!['rulesRepoJWT'],
            product: input.parameters!['rulesRepoProduct']
        });

        PlanningEngine.init({
            url: input.parameters!['rulesRepoUrl'],
            jwt: input.parameters!['rulesRepoJWT'],
            product: input.parameters!['rulesRepoProduct']
        });
    }


}
