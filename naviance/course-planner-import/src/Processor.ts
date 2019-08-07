import { AnnotationOperator, Annotations, AnnotationType, Batch,
    Course, IAnnotationItems, Namespace, RulesRepository } from "@academic-planner/apSDK";
import { BaseProcessor, IRowData, IRowProcessorInput,
    IRowProcessorOutput, IStepAfterOutput, IStepBeforeInput } from "@data-channels/dcSDK";

export interface ITranslateConfig {
    headers: string[];
    mapping: {
        [name: string]: string;
    };
}

export class CourseImportProcessor extends BaseProcessor {
    private apBatchSize = 200;
    private apBatch: IRowData[] = [];
    private batchCount = 0;
    private namespace = '';
    private originalHeaders: string[] = [];
    private seenCourseIds: { [key: string]: string } = {};
    private schoolsByCourse: { [key: string]: string[] } = {};
    private subjectAreaMapping: { [key: string]: string } = {};

    public async translate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {

        const config = input.parameters!['translationConfig'] as ITranslateConfig;
        if (input.index === 1) {
            this.originalHeaders = input.raw;

            return {
                index: input.index,
                outputs: {
                    default: config.headers
                }
            };
        }

        const newData: { [key: string]: string } = {};
        for (const [idx, val] of input.raw.entries()) {
            const curHeaderVal = this.originalHeaders[idx];
            if (config.mapping[curHeaderVal]) {
                newData[config.mapping[curHeaderVal]] = val;
            } else {
                newData[curHeaderVal] = val;
            }
        }

        const newRow: string[] = [];
        for (const newHeaderVal of config.headers) {
            newRow.push(newData[newHeaderVal] || '');
        }

        return {
            index: input.index,
            outputs: {
                default: newRow
            }
        };
    }

    public async validate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        return {
            outputs: {
                [`${input.name}Validated`]:
                    input.index === 1 ? input.raw.concat(['IS_VALID']) : input.raw.concat(['valid'])
            }
        };
    }

    private async processBatch(): Promise<void> {
        this.batchCount += 1;
        const b = new Batch({namespace: new Namespace(this.namespace)});
        const courses: Course[] = [];
        for (const rowData of this.apBatch) {
            const credits = parseFloat(rowData['Credits']) || 0;
            const instructionalLevel = rowData['Instructional_Level'] || 'UT';
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
        }
        b.addItems(courses);
        await b.createOrUpdate();
        this.apBatch = [];
    }

    public async before_batchToAp(input: IStepBeforeInput) {
        RulesRepository.init({
            url: input.parameters!['rulesRepoUrl'],
            jwt: input.parameters!['rulesRepoJWT'],
            product: input.parameters!['rulesRepoProduct']
        });
        this.namespace = input.parameters!['namespace'];

        const subjectAreaPager = AnnotationType.find(
            new Namespace(this.namespace), { findCriteria: { name: 'SUBJECT_AREA' } });
        const subAreasFound = await subjectAreaPager.all();
        if (subAreasFound.length > 0) {
            const subArea = subAreasFound[0];
            for (const subString of subArea.stringValues) {
                const [navSub, schoolSub] = subString.split('_');
                this.subjectAreaMapping[schoolSub] = subString;
            }
        }
    }

    public async batchToAp(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.data['IS_VALID'] === 'valid') {
            if (input.name === 'mappingValidated') {
                if (!this.schoolsByCourse[input.data['Course_ID']]) {
                    this.schoolsByCourse[input.data['Course_ID']] = [];
                }
                this.schoolsByCourse[input.data['Course_ID']].push(input.data['School_ID']);
            } else {
                this.apBatch.push(input.data);
            }
        }
        if (this.apBatch.length === this.apBatchSize) {
            await this.processBatch();
        }

        return {
            index: input.index,
            outputs: {}
        };
    }

    public async after_batchToAp(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        if (this.apBatch.length > 0) {
            await this.processBatch();
        }

        return { results: {
            batchCount: this.batchCount
        }};
    }
}
