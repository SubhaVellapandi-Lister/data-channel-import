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
    private apBatchSize = 100;
    private apBatch: IRowData[] = [];
    private batchCount = 0;
    private duplicatesSkipped = 0;
    private coursesPushed = 0;
    private namespace = '';
    private originalHeaders: string[] = [];
    private seenCourseIds: { [key: string]: string } = {};
    private schoolsByCourse: { [key: string]: string[] } = {};
    private navianceSchoolByLocalId: { [key: string]: string } = {};
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
    private scedMapping = {
        '01': 'English Language and Literature',
        '02': 'Mathematics',
        '03': 'Life and Physical Sciences',
        '04': 'Social Sciences and History',
        '05': 'Visual and Performing Arts',
        '06': 'Foreign Language and Literature',
        '07': 'Religious Education and Theology',
        '08': 'Physical, Health, and Safety Education',
        '09': 'Military Science',
        '10': 'Information Technology',
        '11': 'Communication and Audio/Visual Technology',
        '12': 'Business and Marketing',
        '13': 'Manufacturing',
        '14': 'Health Care Sciences',
        '15': 'Public, Protective, and Government Services',
        '16': 'Hospitality and Tourism',
        '17': 'Architecture and Construction',
        '18': 'Agriculture, Food, and Natural Resources',
        '19': 'Human Services',
        '20': 'Transportation, Distribution and Logistics',
        '21': 'Engineering and Technology',
        '22': 'Miscellaneous',
        '23': 'Non-Subject-Specific',
        '24': 'World Languages'
    };
    private subjectsCreated: number = 0;
    private foundSubArea: AnnotationType | null = null;

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

    public async loadExistingSubjectAreas() {
        const subjectAreaPager = AnnotationType.find(
            new Namespace(this.namespace), { findCriteria: { name: 'SUBJECT_AREA' } });
        const subAreasFound = await subjectAreaPager.all();
        if (subAreasFound.length > 0) {
            const subArea = subAreasFound[0];
            this.foundSubArea = subArea;
            for (const subString of subArea.stringValues) {
                const [navSub, schoolSub] = subString.split('_');
                this.subjectAreaMapping[schoolSub] = subString;
            }
        }
    }

    public async before_createSubjects(input: IStepBeforeInput) {
        RulesRepository.init({
            url: input.parameters!['rulesRepoUrl'],
            jwt: input.parameters!['rulesRepoJWT'],
            product: input.parameters!['rulesRepoProduct']
        });
        this.namespace = input.parameters!['namespace'];

        this.loadExistingSubjectAreas();
    }

    public async createSubjects(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            // skip header
            return { outputs: {}};
        }

        if (input.data['JSON_OBJECT']) {
            // migration file
            const rowObj = JSON.parse(input.data['JSON_OBJECT']);
            this.subjectAreaMapping[rowObj['subjectArea']['name']] =
                `${rowObj['subjectArea']['name']}_${rowObj['subjectArea']['category']}`;
        } else {
            // client file, no naviance code so look for sced
            const rowSub = input.data['Subject_Area'];
            const rowSced = input.data['SCED_Subject_Area'];

            if (!rowSced || !rowSub || !rowSced.length || !rowSub.length) {
                return { outputs: {}};
            }

            const scedMap = this.scedMapping[rowSced] || this.scedMapping['0' + rowSced];

            if (!this.subjectAreaMapping[rowSub] && scedMap) {
                this.subjectsCreated += 1;
                this.subjectAreaMapping[rowSub] = `${scedMap}_${rowSub}`;
            }
        }

        return {
            outputs: {}
        };
    }

    public async after_createSubjects(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        const subjectAreaValues = Object.values(this.subjectAreaMapping);
        let createdAnnotationType = false;
        if (this.foundSubArea) {
            this.foundSubArea.values = subjectAreaValues;
        } else {
            createdAnnotationType = true;
            this.foundSubArea = new AnnotationType(
                'SUBJECT_AREA',
                'Subject Area',
                Annotations.simple({
                    description: "Type used to describe Subject Areas (MATHEMATICS_MATH)"
                }),
                subjectAreaValues);
        }
        await this.foundSubArea.save(this.namespace);

        return {
            results: {
                createdAnnotationType,
                subjectAreasAdded: this.subjectsCreated
            }
        };
    }

    private courseFromRowData(rowData: IRowData): Course {
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

        const annoItems: IAnnotationItems = {
            id: { value: rowData['Course_ID'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            number: { value: rowData['Course_ID'], type: 'STRING', operator: AnnotationOperator.EQUALS },
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

        return new Course(
            rowData['Course_ID'],
            rowData['Course_Name'],
            new Annotations(annoItems)
        );
    }

    private courseFromJSON(rowData: IRowData): Course {
        const cObj = JSON.parse(rowData['JSON_OBJECT']);

        const instructLev = cObj['instructionalLevel'] || 'Untracked';
        const isCte = cObj['cteCourse'] === true ? 1 : 0;
        const isTechPrep = cObj['techPrepCourse'] === true ? 1 : 0;
        const expandedSubjectArea =
            this.subjectAreaMapping[cObj['subjectArea']['name']] ||
            'Basic Skills_Unknown';
        const desc = cObj['description'] || cObj['_description'];

        const annoItems: IAnnotationItems = {
            id: { value: cObj['id'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            number: { value: cObj['id'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            name: { value: cObj['name'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            grades: { value: cObj['grades'], type: 'LIST_INTEGER', operator: AnnotationOperator.EQUALS },
            status: { value: cObj['status'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            credits: { value: cObj['credits'], type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            cteCourse: { value: isCte, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            techPrepCourse: { value: isTechPrep, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            stateCode: { value: cObj['stateCode'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            stateId: { value: cObj['stateCode'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            subjectArea: { value: expandedSubjectArea, type: 'STRING', operator: AnnotationOperator.EQUALS },
            instructionalLevel: { value: instructLev, type: 'STRING', operator: AnnotationOperator.EQUALS },
            schools: { value: cObj['schools'] || [], type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            description: { value: desc, type: 'STRING', operator: AnnotationOperator.EQUALS }
        };

        return new Course(
            cObj['id'],
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
                continue;
            }
            this.seenCourseIds[course.name] = course.name;
            courses.push(course);
            this.coursesPushed += 1;
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

        this.loadExistingSubjectAreas();
    }

    public async batchToAp(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.data['IS_VALID'] === 'valid') {
            if (input.name === 'mappingValidated') {
                const localId = input.data['School_ID'];
                const schoolId = this.navianceSchoolByLocalId[localId] || localId;
                if (!this.schoolsByCourse[input.data['Course_ID']]) {
                    this.schoolsByCourse[input.data['Course_ID']] = [];
                }
                this.schoolsByCourse[input.data['Course_ID']].push(schoolId);
            } else if (input.name === 'schoolsValidated') {
                const locSchoolId = input.data['Local_School_ID'];
                const navSchoolId = input.data['Naviance_School_ID'];
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
