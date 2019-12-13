import {
    Annotations,
    Batch,
    Course,
    Namespace,
    PlanContext,
    Program
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IRowData,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import uuidv5 from "uuid/v5";
import { CourseImport } from "./Course";
import { PoSImport } from "./PoS";
import { PlanImport } from "./StudentCoursePlan";
import { StudentHistory } from "./StudentHistory";
import { ISubjectAreaLoad, loadExistingSubjectAreas,
    parseSubjectAreaRow, saveDefaultAnnotationTypes, saveSubjectAreas } from "./SubjectAreas";
import { getRowVal, initRulesRepo, initServices } from "./Utils";

export class CPImportProcessor extends BaseProcessor {
    /* PoS variables */
    private createdCount = 0;
    private updatedCount = 0;
    private errorCount = 0;
    private skipCount = 0;
    private namespace = '';
    private uuidSeed = 'ec3d4a8c-f8ac-47d3-bb77-abcadea819d9';

    /* Course Catalog variables */
    private apBatchSize = 50;
    private apBatch: IRowData[] = [];
    private batchCount = 0;
    private duplicatesSkipped = 0;
    private coursesPushed = 0;
    private seenCourseIds: { [key: string]: string } = {};
    private schoolsByCourse: { [key: string]: string[] } = {};
    private navianceSchoolByLocalId: { [key: string]: string } = {};
    private subjectAreasLoaded: ISubjectAreaLoad = { subjectAreaMapping: {}};
    private subjectsCreated: number = 0;
    private singleHighschoolId = '';
    private historyStudentId = '';
    private historyForStudent: object[] = [];
    private historyBatch: object[][] = [];
    private historyBatchSize = 10;
    private planBatch: object[] = [];
    private planBatchSize = 10;
    private schoolsLoaded = false;
    private coursesLoaded = false;
    private mappingsLoaded = false;
    private allPrograms: Program[] = [];
    private scope: string = '';
    private hasRows: boolean = false;

    public async validate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        // things to validate for
        // 1.  course ID contains spaces (just a warning and remove spaces?)
        // 2.  subject area not found
        // 3.  Invalid column type / value
        // 4.  course ID same as state ID (can be ok for some tenants)
        // 5.  subject area too short (just a warning)

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
        if (!this.namespace) {
            this.namespace = this.job.rawConfig.tenant ? this.job.rawConfig.tenant.name! : '0';
        }
        console.log(`create subjects namespace ${this.namespace}`);
        this.subjectAreasLoaded = await loadExistingSubjectAreas(this.namespace);
        console.log(`subject areas loaded, found: ${this.subjectAreasLoaded.foundSubArea}`);
    }

    public async createSubjects(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            // skip header
            return { outputs: {}};
        }
        this.hasRows = true;
        const subMap = this.subjectAreasLoaded.subjectAreaMapping;

        const created = parseSubjectAreaRow(input.data, subMap, input.parameters!['noCreateSubjects']);
        if (created) {
            this.subjectsCreated += 1;
        }

        return {
            outputs: {}
        };
    }

    public async after_createSubjects(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        let createdAnnotationType = false;
        console.log(`after create subjects, has rows ${this.hasRows}`);
        if (this.hasRows) {
            await saveDefaultAnnotationTypes(this.namespace);
            console.log(`saved default annos`);
            createdAnnotationType = await saveSubjectAreas(this.namespace, this.subjectAreasLoaded);
            console.log(`saved subject areas`);
        }

        return {
            results: {
                createdAnnotationType,
                subjectAreasAdded: this.subjectsCreated
            }
        };
    }

    public async before_batchToAp(input: IStepBeforeInput) {
        initRulesRepo(input.parameters!);
        this.namespace = input.parameters!['namespace'];
        if (!this.namespace) {
            this.namespace = this.job.rawConfig.tenant ? this.job.rawConfig.tenant.name! : '0';
        }

        if (input.parameters!['tenantType'] === 'highschool') {
            this.singleHighschoolId = this.namespace;
        }
        this.apBatchSize = input.parameters!['batchSize'] || this.apBatchSize;

        this.subjectAreasLoaded = await loadExistingSubjectAreas(this.namespace);
    }

    public async batchToAp(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            return {
                outputs: {}
            };
        }

        if (input.name.toUpperCase().startsWith('MAPPING')) {
            this.mappingsLoaded = true;
            const localId = getRowVal(input.data, 'School_ID') || '';
            const schoolId =
                this.navianceSchoolByLocalId[localId] ||
                this.navianceSchoolByLocalId['0' + localId] ||
                localId;

            const courseId = getRowVal(input.data, 'Course_ID') || getRowVal(input.data, 'Course_Code') || '';
            // console.log(`${courseId} ${schoolId}`);
            if (!this.schoolsByCourse[courseId]) {
                this.schoolsByCourse[courseId] = [];
            }
            if (!this.schoolsByCourse[courseId].includes(schoolId)) {
                this.schoolsByCourse[courseId].push(schoolId);
            }
        } else if (input.name.toUpperCase().startsWith('SCHOOL')) {
            this.schoolsLoaded = true;
            const locSchoolId = getRowVal(input.data, 'Local_School_ID') || '';
            const navSchoolId = getRowVal(input.data, 'Naviance_School_ID') || '';
            this.navianceSchoolByLocalId[locSchoolId] = navSchoolId;
        } else {
            this.coursesLoaded = true;
            this.apBatch.push(input.data);
        }
        if (this.apBatch.length === this.apBatchSize) {
            await this.processBatch();
        }

        return {
            index: input.index,
            outputs: {}
        };
    }

    private async processBatch(): Promise<void> {
        this.batchCount += 1;
        const namespace = new Namespace(this.namespace);
        const b = new Batch({namespace});
        const courses: Course[] = [];
        const existingByName: { [name: string]: Course} = {};
        if (!this.mappingsLoaded && !this.apBatch[0]['JSON_OBJECT']) {
            // csv import but no mapping file, try to keep existing mappings for courses
            const batchCourseIds = this.apBatch
                .map((rowData) => CourseImport.finalCourseId(
                    getRowVal(rowData, 'Course_ID') || getRowVal(rowData, 'Course_Code') || '')
                )
                .filter((cid) => cid.length > 0);

            const existingCourses = await CourseImport.getBatchOfCourses(batchCourseIds, this.namespace);
            for (const existCourse of existingCourses) {
                existingByName[existCourse.name] = existCourse;
            }
        }
        for (const rowData of this.apBatch) {
            const course = rowData['JSON_OBJECT'] ?
                CourseImport.courseFromJSON(rowData) :
                CourseImport.courseFromRowData(
                    rowData,
                    this.singleHighschoolId,
                    this.subjectAreasLoaded,
                    this.schoolsByCourse,
                    existingByName[CourseImport.finalCourseId(
                        getRowVal(rowData, 'Course_ID') || getRowVal(rowData, 'Course_Code') || '')
                    ]);

            if (!course) {
                continue;
            }

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

    public async after_batchToAp(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        console.log('AFTER', this.apBatch.length);
        if (this.apBatch.length > 0) {
            await this.processBatch();
        }

        let mappingsUpdated = 0;
        if (!this.coursesLoaded && this.mappingsLoaded) {
            // only importing mappings
            mappingsUpdated = await CourseImport.processMappingsByBatch(this.schoolsByCourse, this.namespace);
        }

        return { results: {
            batchCount: this.batchCount,
            duplicatesSkipped: this.duplicatesSkipped,
            coursesPushed: this.coursesPushed,
            mappingsUpdated
        }};
    }

    public async importPoS(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            return {
                outputs: {
                    default: [ 'ID', 'NAME', 'STATUS' ]
                }
            };
        }

        const rowData = input.data;

        const cObj = JSON.parse(rowData['JSON_OBJECT']);

        const programId = uuidv5(cObj['name'], this.uuidSeed);

        if (input.parameters!['tenantType'] === 'highschool') {
            this.singleHighschoolId = this.namespace;
        }

        console.log('STARTING', programId);

        const existing = await Program.findOne({ namespace: new Namespace(this.namespace), itemName: programId});
        const annoItems = PoSImport.annotations(cObj, this.singleHighschoolId);
        const statements = PoSImport.requirements(cObj, this.uuidSeed);

        let program: Program;
        let status = 'UPDATED';
        let saveAuthor = 'migration';
        if (existing) {
            const isSafe = existing.authorId === 'migration';
            existing.annotations = new Annotations(annoItems);
            existing.setMetaValueForKey('activeSchools', annoItems['activeSchools'].value);
            if (isSafe || !input.parameters!['metadataOnly']) {
                existing.statements = statements;
            } else {
                console.log('Updating metadata only');
                saveAuthor = 'migration-info-only';
            }
            program = existing;
            this.updatedCount += 1;
            console.log(`Updating ${programId} - ${existing.display}`);
        } else {
            program = new Program(programId, cObj['name'], new Annotations(annoItems), statements);
            program.setMetaValueForKey('activeSchools', annoItems['activeSchools'].value);
            this.createdCount += 1;
            status = 'CREATED';
            console.log(`Creating ${programId} - ${program.display}`);
        }

        if (input.parameters!['verbose']) {
            console.log(program.toChute());
        }

        if (!statements.length) {
            console.log(`Error ${programId} - no valid statements`);
            status = 'ERROR';
        } else {
            await program.save(new Namespace(this.namespace), saveAuthor);
            console.log(`SAVED ${programId} - ${program.display}`);
        }

        return {
            outputs: {
                default: [ programId, program.name, status ]
            }
        };
    }

    public async before_importPoS(input: IStepBeforeInput) {
        initRulesRepo(input.parameters!);
        this.namespace = input.parameters!['namespace'];
    }

    public async after_importPoS(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        return { results: {
            createdCount: this.createdCount,
            updatedCount: this.updatedCount
        }};
    }

    public async importHistories(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1 || input.data['JSON_OBJECT'] === 'JSON_OBJECT') {
            return { outputs: {} };
        }

        const rowData = input.data;
        const cObj = JSON.parse(rowData['JSON_OBJECT']);
        const studentId = cObj['studentId'].toString();
        if (this.historyStudentId !== studentId && this.historyForStudent.length) {
            this.historyBatch.push([...this.historyForStudent]);
            this.historyForStudent = [];
            this.historyStudentId = studentId;

            if (this.historyBatch.length >= this.historyBatchSize) {
                const [createdCount, updatedCount] = await StudentHistory.processBatch(
                    this.namespace, this.historyBatch);
                this.createdCount += createdCount;
                this.updatedCount += updatedCount;
                console.log(`Processed batch of ${this.historyBatch.length} students`);
                this.historyBatch = [];
            }
        }
        this.historyForStudent.push(cObj);

        return { outputs: {} };
    }

    public async before_importHistories(input: IStepBeforeInput) {
        initServices(input.parameters!);
        this.namespace = `naviance.${input.parameters!['tenantId']}`;
        if (input.parameters!['batchSize']) {
            this.historyBatchSize = input.parameters!['batchSize'];
        }
    }

    public async after_importHistories(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        if (this.historyBatch.length) {
            await StudentHistory.processBatch(this.namespace, this.historyBatch);
            console.log(`Processed batch of ${this.historyBatch.length} students`);
        }

        return { results: {
            createdCount: this.createdCount,
            updatedCount: this.updatedCount
        }};
    }

    public async importStudentCoursePlans(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            return { outputs: {} };
        }

        const rowData = input.data;
        if (rowData['JSON_OBJECT'] !== 'JSON_OBJECT') {
            this.planBatch.push(JSON.parse(rowData['JSON_OBJECT']));
        }
        const createOnly = input.parameters!['createOnly'] === true;
        if (this.planBatch.length >= this.planBatchSize) {
            const [creates, updates, errors, skips] = await PlanImport.batchImportPlan(
                this.scope, this.planBatch, this.allPrograms, createOnly);
            this.createdCount += creates;
            this.updatedCount += updates;
            this.errorCount += errors;
            this.skipCount += skips;
            this.planBatch = [];
        }

        return { outputs: {} };
    }

    public async before_importStudentCoursePlans(input: IStepBeforeInput) {
        initServices(input.parameters!);
        this.namespace = `naviance.${input.parameters!['namespace']}`;
        if (input.parameters!['scope']) {
            // use schoolID from PoS instead
            this.scope = `naviance.${input.parameters!['scope']}`;
        } else {
            this.scope = this.namespace;
        }
        this.allPrograms = await PlanImport.allPrograms(input.parameters!['namespace']);
    }

    public async after_importStudentCoursePlans(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        if (this.planBatch.length > 0) {
            const [creates, updates, errors, skips] = await PlanImport.batchImportPlan(
                this.scope, this.planBatch, this.allPrograms);
            this.createdCount += creates;
            this.updatedCount += updates;
            this.errorCount += errors;
            this.skipCount += skips;
        }

        return { results: {
            createdCount: this.createdCount,
            updatedCount: this.updatedCount,
            errorCount: this.errorCount,
            skipCount: this.skipCount
        }};
    }
}
