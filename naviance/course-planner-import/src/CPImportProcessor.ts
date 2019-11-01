import {
    Annotations,
    Batch,
    Course,
    Namespace,
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
import { ISubjectAreaLoad, loadExistingSubjectAreas,
    parseSubjectAreaRow, saveSubjectAreas } from "./SubjectAreas";
import { getRowVal, initRulesRepo } from "./Utils";

export class CPImportProcessor extends BaseProcessor {
    /* PoS variables */
    private createdCount = 0;
    private updatedCount = 0;
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

    public async before_batchToAp(input: IStepBeforeInput) {
        initRulesRepo(input.parameters!);
        this.namespace = input.parameters!['namespace'];

        if (input.parameters!['singleHighschoolId']) {
            this.singleHighschoolId = input.parameters!['singleHighschoolId'];
        }
        this.apBatchSize = input.parameters!['batchSize'] || this.apBatchSize;

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

                const courseId = getRowVal(input.data, 'Course_ID') || getRowVal(input.data, 'Course_Code') || '';
                // console.log(`${courseId} ${schoolId}`);
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

    private async processBatch(): Promise<void> {
        this.batchCount += 1;
        const b = new Batch({namespace: new Namespace(this.namespace)});
        const courses: Course[] = [];
        for (const rowData of this.apBatch) {
            const course = rowData['JSON_OBJECT'] ?
                CourseImport.courseFromJSON(rowData) :
                CourseImport.courseFromRowData(
                    rowData, this.singleHighschoolId, this.subjectAreasLoaded, this.schoolsByCourse);

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

        return { results: {
            batchCount: this.batchCount,
            duplicatesSkipped: this.duplicatesSkipped,
            coursesPushed: this.coursesPushed
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

        console.log('STARTING', programId);

        const existing = await Program.findOne({ namespace: new Namespace(this.namespace), itemName: programId});
        const annoItems = PoSImport.annotations(cObj);
        const statements = PoSImport.requirements(cObj, this.uuidSeed);

        let program: Program;
        let status = 'UPDATED';
        if (existing) {
            existing.annotations = new Annotations(annoItems);
            existing.statements = statements;
            program = existing;
            this.updatedCount += 1;
            console.log(`Updating ${programId} - ${existing.display}`);
        } else {
            program = new Program(programId, cObj['name'], new Annotations(annoItems), statements);
            this.createdCount += 1;
            status = 'CREATED';
            console.log(`Creating ${programId} - ${program.display}`);
        }

        await program.save(new Namespace(this.namespace), 'migration');

        console.log(`SAVED ${programId} - ${program.display}`);

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
}