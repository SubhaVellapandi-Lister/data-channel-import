import {
    AnnotationOperator,
    Annotations,
    Batch,
    Course,
    CourseStatement,
    IAnnotationItems,
    Namespace
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IRowData,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { instructionalLevelMap } from "./Contants";
import { getCombinedSubjectArea, getMigratedSubjectArea, ISubjectAreaLoad, loadExistingSubjectAreas,
    parseSubjectAreaRow, saveSubjectAreas } from "./SubjectAreas";
import { getRowVal, initRulesRepo, prereqCourseStatement } from "./Utils";

export interface ITranslateConfig {
    headers: string[];
    mapping: {
        [name: string]: string;
    };
}

export class CourseImportProcessor extends BaseProcessor {
    private apBatchSize = 10;
    private apBatch: IRowData[] = [];
    private batchCount = 0;
    private duplicatesSkipped = 0;
    private coursesPushed = 0;
    private namespace = '';
    private seenCourseIds: { [key: string]: string } = {};
    private schoolsByCourse: { [key: string]: string[] } = {};
    private navianceSchoolByLocalId: { [key: string]: string } = {};
    private subjectAreasLoaded: ISubjectAreaLoad = { subjectAreaMapping: {}};
    private subjectsCreated: number = 0;
    private singleHighschoolId = '';

    public async validate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        // things to validate for
        // 1.  course ID contains spaces (just a warning and remove spaces?)
        // 2.  subject area not found
        // 3.  Invalid column type / value

        return {
            outputs: {
                [`${input.name}Validated`]:
                    input.index === 1 ? input.raw.concat(['IS_VALID']) : input.raw.concat(['valid'])
            }
        };
    }

    public async before_createSubjects(input: IStepBeforeInput) {
        initRulesRepo(input.parameters!);
        this.namespace = input.parameters!['namespace'];
        this.subjectAreasLoaded = await loadExistingSubjectAreas(this.namespace);
    }

    public async createSubjects(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            // skip header
            return { outputs: {}};
        }
        const subMap = this.subjectAreasLoaded.subjectAreaMapping;

        const created = parseSubjectAreaRow(input.data, subMap);
        if (created) {
            this.subjectsCreated += 1;
        }

        return {
            outputs: {}
        };
    }

    public async after_createSubjects(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        const createdAnnotationType = saveSubjectAreas(this.namespace, this.subjectAreasLoaded);

        return {
            results: {
                createdAnnotationType,
                subjectAreasAdded: this.subjectsCreated
            }
        };
    }

    private courseFromRowData(rowData: IRowData): Course {
        const courseId = getRowVal(rowData, 'Course_ID') || '';
        const courseName = getRowVal(rowData, 'Course_Name') || getRowVal(rowData, 'Course_Title') || '';
        const stateId = getRowVal(rowData, 'State_ID') || getRowVal(rowData, 'State_Category_Code') || '';
        const credits = parseFloat(getRowVal(rowData, 'Credits') || getRowVal(rowData, 'Credit') || '0') || 0;
        const instructionalLevelCode = getRowVal(rowData, 'Instructional_Level') || 'UT';
        const instructionalLevel = instructionalLevelMap[instructionalLevelCode] || 'Untracked';
        const statusCode = (getRowVal(rowData, 'Status') || getRowVal(rowData, 'Active')) === 'Y' || '1'
            ? 'ACTIVE' : 'INACTIVE';
        const isCte = getRowVal(rowData, 'CTE') === 'Y' ? 1 : 0;
        const isTechPrep = 0;
        const schoolsList = this.schoolsByCourse[courseId] || [];
        if (!schoolsList.length && this.singleHighschoolId) {
            schoolsList.push(this.singleHighschoolId);
        }
        const rowSub = getRowVal(rowData, 'Subject_Area') || getRowVal(rowData, 'SUBJECT_AREA_1') || '';
        const combinedSubjectArea = getCombinedSubjectArea(
            rowSub, getRowVal(rowData, 'SCED_Subject_Area') || '', this.subjectAreasLoaded
        );
        const grades: number[] = [];
        for (const g of [6, 7, 8, 9, 10, 11, 12]) {
            if (getRowVal(rowData, `GR${g}`) === 'Y') {
                grades.push(g);
            }
        }
        if (!grades.length) {
            const gradeLow = parseInt(getRowVal(rowData, 'Grade_Low') || getRowVal(rowData, 'GRADE_RANGE_LOW') || '');
            const gradeHigh = parseInt(
                (getRowVal(rowData, 'Grade_High') || getRowVal(rowData, 'GRADE_RANGE_HIGH') || '').replace('+', ''));
            if (gradeLow && gradeHigh && gradeHigh >= gradeLow) {
                let curGrade = gradeLow;
                while (curGrade <= gradeHigh) {
                    grades.push(curGrade);
                    curGrade += 1;
                }
            }
        }

        const description = (getRowVal(rowData, 'Description') || '')
            .replace('\\n', ' ').replace(/\n/g, ' ').replace(/\"/g, "'").replace(/\r/g, '').replace('\\r', ' ');

        const annoItems: IAnnotationItems = {
            id: { value: courseId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            number: { value: courseId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            name: { value: courseName, type: 'STRING', operator: AnnotationOperator.EQUALS },
            grades: { value: grades, type: 'LIST_INTEGER', operator: AnnotationOperator.EQUALS },
            status: { value: statusCode, type: 'STRING', operator: AnnotationOperator.EQUALS },
            credits: { value: credits, type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            cteCourse: { value: isCte, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            techPrepCourse: { value: isTechPrep, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            stateCode: { value: stateId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            stateId: { value: stateId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            subjectArea: { value: combinedSubjectArea, type: 'STRING', operator: AnnotationOperator.EQUALS },
            instructionalLevel: { value: instructionalLevel, type: 'STRING', operator: AnnotationOperator.EQUALS },
            schools: { value: schoolsList, type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            description: { value: description, type: 'STRING', operator: AnnotationOperator.EQUALS },
            prerequisites: {
                value: getRowVal(rowData, 'Prereq_Text') || '', type: 'STRING', operator: AnnotationOperator.EQUALS
            }
        };

        if (getRowVal(rowData, 'Elective')) {
            const isElective = getRowVal(rowData, 'Elective') === 'Y' ? 1 : 0;
            annoItems['elective'] = { value: isElective, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS };
        }

        if (getRowVal(rowData, 'Max_Enroll')) {
            const maxEnroll = parseInt(getRowVal(rowData, 'Max_Enroll') || '');
            annoItems['maxEnroll'] = { value: maxEnroll, type: 'DECIMAL', operator: AnnotationOperator.EQUALS };
        }

        if (getRowVal(rowData, 'Course_Duration')) {
            annoItems['courseDuration'] = {
                value: getRowVal(rowData, 'Course_Duration') || '', type: 'STRING', operator: AnnotationOperator.EQUALS
            };
        }

        const statements: CourseStatement[] = [];

        if (getRowVal(rowData, 'Prereq_ID')) {
            const cs = prereqCourseStatement(getRowVal(rowData, 'Prereq_ID') || '');
            if (cs) {
                statements.push(cs);
            }
        }

        if (getRowVal(rowData, 'Coreq_ID')) {
            const cs = prereqCourseStatement(getRowVal(rowData, 'Coreq_ID') || '');
            if (cs) {
                cs.annotations = Annotations.simple({coreq: true});
                statements.push(cs);
            }
        }

        const strippedCourseId = courseId.replace(/\s/g, '');

        return new Course(
            strippedCourseId,
            courseName,
            new Annotations(annoItems),
            statements
        );
    }

    private courseFromJSON(rowData: IRowData): Course {
        const cObj = JSON.parse(rowData['JSON_OBJECT']);

        const instructLev = cObj['instructionalLevel'] || 'Untracked';
        const isCte = cObj['cteCourse'] === true ? 1 : 0;
        const isTechPrep = cObj['techPrepCourse'] === true ? 1 : 0;
        const subName = cObj['subjectArea'] ? cObj['subjectArea']['name'] : 'Unknown';
        const subCategory = cObj['subjectArea'] ? cObj['subjectArea']['category'] : 'Basic Skills';
        const combinedSubjectArea = getMigratedSubjectArea(subName, subCategory);
        const desc = cObj['description'] || cObj['_description'];
        const courseId = cObj['id'] || cObj['schoolCode'];
        const schoolList = cObj['schools'] || [];
        if (!schoolList.length && cObj['highschoolId']) {
            schoolList.push(cObj['highschoolId']);
        }

        const annoItems: IAnnotationItems = {
            id: { value: courseId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            number: { value: courseId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            name: { value: cObj['name'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            grades: { value: cObj['grades'], type: 'LIST_INTEGER', operator: AnnotationOperator.EQUALS },
            status: { value: cObj['status'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            credits: { value: cObj['credits'], type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            cteCourse: { value: isCte, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            techPrepCourse: { value: isTechPrep, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            stateCode: { value: cObj['stateCode'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            stateId: { value: cObj['stateCode'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            subjectArea: { value: combinedSubjectArea, type: 'STRING', operator: AnnotationOperator.EQUALS },
            instructionalLevel: { value: instructLev, type: 'STRING', operator: AnnotationOperator.EQUALS },
            schools: { value: schoolList, type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            description: { value: desc, type: 'STRING', operator: AnnotationOperator.EQUALS }
        };

        const strippedCourseId = courseId.replace(/\s/g, '');

        return new Course(
            strippedCourseId,
            cObj['name'],
            new Annotations(annoItems)
        );
    }

    private async processBatch(): Promise<void> {
        this.batchCount += 1;
        const b = new Batch({namespace: new Namespace(this.namespace)});
        const courses: Course[] = [];
        for (const rowData of this.apBatch) {
            const course = rowData['JSON_OBJECT'] ?
                this.courseFromJSON(rowData) : this.courseFromRowData(rowData);

            if (this.seenCourseIds[course.name]) {
                this.duplicatesSkipped += 1;
                console.log('DUPLICATE', course.name);
                continue;
            }
            this.seenCourseIds[course.name] = course.name;
            courses.push(course);
            this.coursesPushed += 1;
        }
        b.addItems(courses);
        console.log('COURSES', courses.length);
        await b.createOrUpdate();
        this.apBatch = [];
    }

    public async before_batchToAp(input: IStepBeforeInput) {
        initRulesRepo(input.parameters!);
        this.namespace = input.parameters!['namespace'];

        if (input.parameters!['singleHighschoolId']) {
            this.singleHighschoolId = input.parameters!['singleHighschoolId'];
        }

        this.subjectAreasLoaded = await loadExistingSubjectAreas(this.namespace);
    }

    public async batchToAp(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.data['IS_VALID'] === 'valid') {
            if (input.name === 'mappingValidated') {
                const localId = getRowVal(input.data, 'School_ID') || '';
                const schoolId =
                    this.navianceSchoolByLocalId[localId] ||
                    this.navianceSchoolByLocalId['0' + localId] ||
                    localId;
                const courseId = getRowVal(input.data, 'Course_ID') || '';
                if (!this.schoolsByCourse[courseId]) {
                    this.schoolsByCourse[courseId] = [];
                }
                if (!this.schoolsByCourse[courseId].includes(schoolId)) {
                    this.schoolsByCourse[courseId].push(schoolId);
                }
            } else if (input.name === 'schoolsValidated') {
                const locSchoolId = getRowVal(input.data, 'Local_School_ID') || '';
                const navSchoolId = getRowVal(input.data, 'Naviance_School_ID') || '';
                this.navianceSchoolByLocalId[locSchoolId] = navSchoolId;
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
        console.log('AFTER', this.apBatch.length);
        if (this.apBatch.length > 0) {
            await this.processBatch();
        }

        return { results: {
            batchCount: this.batchCount,
            duplicatesSkipped: this.duplicatesSkipped,
            coursesPushed: this.coursesPushed
        }};
    }
}
