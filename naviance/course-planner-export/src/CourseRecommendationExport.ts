import { ICourseRecord, IPlan } from "@academic-planner/academic-planner-common";
import {
    Course,
    Namespace,
    Program,
    ProgramReference,
    RawStorage,
    Remark,
    SlimStudentPlan,
    StudentPlan
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IOutputByName,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterInput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import _ from "lodash";
import { INavianceStudent, INavianceStudentIDMap, readStudents} from "./Student";
import { initServices, sleep } from "./Utils";

interface IPlanSet {
    slim: SlimStudentPlan;
    full?: StudentPlan;
}

interface IHsMap {
    [hsId: string]: string[];
}

interface IExportParameters {
    exports: IExportMap;
    tenantId: string;
    academicYear?: number;
    academicYearOrGreater?: boolean;
    highschools?: string[];
    namespace?: string;
    parallelSchools?: number;
}

interface IExportMap {
    [name: string]: IExportConfig;
}

interface IExportConfig {
    customHeaders?: string[];
    headersToWrite?: string[];
    rowPerPlan?: boolean;
    numCourseCols?: number;
    rewriteHeaderLabels?: boolean;
    sisStudentId?: boolean;
    currentPlansOnly?: boolean;
    academicYear?: number;
    academicYearOrGreater?: boolean;
}

interface ISchoolExportNumbers {
    [name: string]: number;
}

const headers = [
    'Highschool_ID',
    'Highschool_Name',
    'Student_ID',
    'Last_Name',
    'First_Name',
    'Class_Year',
    'Course_ID',
    'Course_Name',
    'Recommended_Date'
];

export class RecommendationExportProcessor extends BaseProcessor {
    private courseByGuid: { [guid: string]: Course | null } = {};
    private recosExported: ISchoolExportNumbers = {};
    private schoolNamesById: { [id: string]: string } = {};
    private studentsById: INavianceStudentIDMap = {};
    private configItems: { [name: string]: string } = {};

    private async findCourses(namespace: Namespace, guids: string[]) {
        const searchGuids = _.uniq(guids.filter((guid) => !this.courseByGuid[guid]));
        if (searchGuids) {
            const chunkSize = 50;
            const chunks = Array.from({ length: Math.ceil(searchGuids.length / chunkSize) }, (_v, i) =>
                searchGuids.slice(i * chunkSize, i * chunkSize + chunkSize),
            );
            for (const guidChunk of chunks) {
                async function getCourses(): Promise<Course[]> {
                    const pager = Course.find(namespace, {
                        findCriteria: {
                            guid: { operator: 'in', value: guidChunk}
                        }
                    });

                    return await pager.all();
                }

                let coursesFound: Course[] = [];

                try {
                    coursesFound = await getCourses();
                } catch (err) {
                    console.log('ERROR GETTING COURSE, RETRYING...');
                    await sleep(2000);
                    coursesFound = await getCourses();
                }

                for (const course of coursesFound) {
                    this.courseByGuid[course.guid!] = course;
                }
            }
        }
    }

    private studentRec(studentId: string): INavianceStudent | null {
        if (!this.studentsById[studentId]) {
            return null;
        }
        for (const rec of this.studentsById[studentId]) {
            if (rec && rec.isActive) {
                return rec;
            }
        }

        return null;
    }

    public async before_exportRecommendations(input: IStepBeforeInput) {
        initServices(input.parameters!);
    }

    private async processHighschool(
        dsId: string, hsId: string
    ): Promise<string[][]> {

        console.log(`processing school ${hsId}`);
        const namespace = new Namespace(dsId);

        const results: string[][] = [];

        const pager = Remark.find({
            findCriteria: {
                scope: { value: `naviance.${hsId}`},
            },
            pageSize: 500
        });

        let page: Remark[];
        try {
            page = await pager.page(1);
        } catch (err) {
            console.log('ERROR GETTING FIRST PAGE OF REMARKS, RETRYING...');
            await sleep(2000);
            page = await pager.page(1);
        }

        while (page.length) {
            console.log(`processing page of ${page.length} remarks`);

            await this.findCourses(namespace, page.map((rmk) => rmk.targetId));

            for (const remark of page) {

                const student = this.studentRec(remark.studentPrincipleId || '');

                if (!student) {
                    continue;
                }

                const studentHighschool = student && student.highschoolName ? student.highschoolName : '';
                const course = this.courseByGuid[remark.targetId];

                if (!course) {
                    console.log(`Could not find course for guid ${remark.targetId}`);
                    continue;
                }

                const rowData = {
                    Highschool_ID: hsId,
                    Highschool_Name: this.schoolNamesById[hsId] || studentHighschool,
                    Student_ID: student.sisId || remark.studentPrincipleId!,
                    Last_Name: student.lastName || '',
                    First_Name: student.firstName || '',
                    Class_Year: student.classYear || '',
                    Course_ID: course.name,
                    Course_Name: course.annotations.getValue('name') as string,

                    Recommended_Date: remark.created ? remark.created.toISOString() : ''
                };

                const flatRow = headers.map((headerName) => (rowData[headerName] || '').toString());
                results.push(flatRow);
            }

            try {
                page = await pager.next();
            } catch {
                console.log('ERROR GETTING NEXT PAGE OF PLANS, RETRYING...');
                await sleep(2000);
                page = await pager.next();
            }
        }

        console.log(`finished school ${hsId}`);

        return results;
    }

    // main call just loads in student data from prior naviance export step
    public async exportRecommendations(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            return { outputs: {} };
        }

        try {
            const student = JSON.parse(input.data['JSON_OBJECT']) as INavianceStudent;
            const navId = student.id.toString();
            if (!this.studentsById[navId]) {
                this.studentsById[navId] = [student];
            } else {
                this.studentsById[navId].push(student);
            }
        } catch (err) {
            console.log(`Error row ${input.index}`, err);
        }

        return { outputs: {} };
    }

    private parseHsToProcess(params: IExportParameters): string[] {
        const schoolId = params.tenantId;
        const hsMapping = this.job.steps['findSchools'].output!['hsMapping'] as IHsMap;
        let highschoolsToProcess = [schoolId];
        if (hsMapping[schoolId]) {
            highschoolsToProcess = [];
            for (const hsInfo of hsMapping[schoolId]) {
                let name = '';
                let id = hsInfo;
                if (hsInfo.includes(',')) {
                    [id, name] = hsInfo.split(',');
                }
                highschoolsToProcess.push(id);
                this.schoolNamesById[id] = name;
            }
        }

        if (params.highschools) {
            highschoolsToProcess = highschoolsToProcess.filter(
                (hsId) => params.highschools!.includes(hsId));
        }

        return highschoolsToProcess;
    }

    public async after_exportRecommendations(input: IStepAfterInput): Promise<IStepAfterOutput> {
        const params = input.parameters! as IExportParameters;
        const schoolId = params.tenantId;
        const parentId = params.namespace || schoolId;
        const highschoolsToProcess = this.parseHsToProcess(params);

        console.log(`district ${schoolId} processing schools ${highschoolsToProcess}`);

        const chunkSize = params.parallelSchools || 6;
        const chunks = Array.from({ length: Math.ceil(highschoolsToProcess.length / chunkSize) }, (_v, i) =>
            highschoolsToProcess.slice(i * chunkSize, i * chunkSize + chunkSize),
        );

        this.writeOutputRow(input.outputs['Recommendations'].writeStream, headers);

        for (const [idx, chunk] of chunks.entries()) {
            console.log(`processing chunk ${idx + 1} of ${chunks.length}`);
            const promises: Promise<string[][]>[] = [];
            for (const hsId of chunk) {
                promises.push(this.processHighschool(parentId, hsId));
            }

            const results = await Promise.all(promises);
            for (const [hsIdx, hsResult] of results.entries()) {
                this.recosExported[chunk[hsIdx]] = hsResult.length;
                for (const row of hsResult) {
                    this.writeOutputRow(input.outputs['Recommendations'].writeStream, row);
                }
            }
        }

        return { results: {
            recosExported: this.recosExported
        }};
    }
}
