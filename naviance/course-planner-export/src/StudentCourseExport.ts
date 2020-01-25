import { ICourseRecord, IPlan } from "@academic-planner/academic-planner-common";
import {
    Course,
    Namespace,
    Program,
    SlimStudentPlan,
    StudentPlan
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { initServices, sleep } from "./Utils";

interface IPlanSet {
    slim: SlimStudentPlan;
    full?: StudentPlan;
}

export class StudentCourseExportProcessor extends BaseProcessor {

    private headers = [
        'Highschool_ID',
        'Highschool_Name',
        'Student_ID',
        'Student_Plan_ID',
        'Student_Last_Update_Date',
        'Student_Plan_Status',
        'Student_Plan_Type',
        'Plan_Of_Study_Name',
        'Grade_Level',
        'Course_ID',
        'Course_Name',
        'Course_Subject',
        'SCED_Code',
        'CSSC_Code',
        'Instructional_Level'
    ];
    private customHeaders: string[] = [];
    private courseByName: { [name: string]: Course | null } = {};
    private coursesExported: { [name: string]: number } = {};
    private programsByName: { [name: string]: Program } = {};
    private schoolNamesById: { [id: string]: string } = {};

    private async findProgram(namespace: Namespace, name: string): Promise<Program> {
        if (!this.programsByName[name]) {
            const fullProg = await Program.findOne({
                namespace, itemName: name
            });
            this.programsByName[name] = fullProg!;
        }

        return this.programsByName[name];
    }

    private async findCourse(namespace: Namespace, name: string): Promise<Course | null> {
        if (!this.courseByName[name]) {
            let course: Course | null;
            try {
                course = await Course.findOne({
                    namespace, itemName: name
                });
            } catch (err) {
                console.log('ERROR GETTING COURSE, RETRYING...');
                sleep(2000);
                course = await Course.findOne({
                    namespace, itemName: name
                });
            }

            this.courseByName[name] = course;
        }

        return this.courseByName[name];
    }

    public async before_exportStudentCourses(input: IStepBeforeInput) {
        initServices(input.parameters!);
    }

    private async processHighschool(
        dsId: string, hsId: string, numCourseRows: number
    ): Promise<string[][]> {

        console.log(`processing school ${hsId}`);
        const namespace = new Namespace(dsId);
        const results: string[][] = [];
        const pager = StudentPlan.find(`naviance.${hsId}`, { expand: 'courses,meta,programs' });
        let page: SlimStudentPlan[];
        try {
            page = await pager.page(1);
        } catch (err) {
            console.log('ERROR GETTING FIRST PAGE OF PLANS, RETRYING...');
            sleep(2000);
            page = await pager.page(1);
        }

        while (page.length) {
            for (const splan of page) {
                let programName = '';
                if (splan.programs) {
                    const program = await this.findProgram(namespace, splan.programs[0].name);
                    programName = program.display;
                }
                let studentPlanStatus = '';
                if (splan.meta) {
                    studentPlanStatus = (splan.meta['status'] as string) || '';
                }
                let studentPlanType = 'draft';
                let updateDate = new Date(splan.created);
                if (splan.meta) {
                    studentPlanType = splan.meta['isActive'] ? 'current' : 'draft';
                    if (splan.meta['lastEdited']) {
                        updateDate = new Date(splan.meta['lastEdited'] as number);
                    }
                }

                const planData = {
                    Highschool_ID: hsId,
                    Student_ID: splan.studentPrincipleId,
                    Student_Plan_ID: splan.guid,
                    Plan_Of_Study_Name: programName,
                    Student_Plan_Status: studentPlanStatus,
                    Student_Plan_Type: studentPlanType,
                    Highschool_Name: this.schoolNamesById[hsId] || '',
                    Student_Last_Update_Date: updateDate.toISOString()
                };

                const courseRowData: object[] = [];

                for (const record of splan.courses || []) {
                    const course = await this.findCourse(namespace, record.number);
                    if (!course) {
                        continue;
                    }

                    const subject = course.annotations.getValue('subjectArea') as string;
                    const [subName, cssc, sced] = subject.split('_');
                    const instLevel = (course.annotations.getValue('instructionalLevel') || '') as string;

                    courseRowData.push({
                        Grade_Level: (record.gradeLevel || '').toString(),
                        Course_ID: record.number,
                        Course_Name: course.display,
                        Course_Subject: subName,
                        SCED_Code: sced,
                        CSSC_Code: cssc,
                        Instructional_Level: instLevel
                    });
                }

                if (numCourseRows > 0) {
                    // one row per plan
                    const allCourseCols = {};
                    for (const [idx, courseData] of courseRowData.entries()) {
                        allCourseCols[`Course${idx + 1}_ID`] = courseData['Course_ID'];
                        allCourseCols[`Course${idx + 1}_Grade`] = courseData['Grade_Level'];
                        allCourseCols[`Course${idx + 1}_Name`] = courseData['Course_Name'];
                    }
                    const rowData = Object.assign(allCourseCols, planData);
                    const flatRow = this.customHeaders.map((headerName) => (rowData[headerName] || '').toString());
                    results.push(flatRow);
                } else {
                    for (const courseData of courseRowData) {
                        const rowData = Object.assign(courseData, planData);
                        const flatRow = this.customHeaders.map((headerName) => (rowData[headerName] || '').toString());
                        results.push(flatRow);
                    }
                }
            }

            try {
                page = await pager.next();
            } catch {
                console.log('ERROR GETTING NEXT PAGE OF PLANS, RETRYING...');
                sleep(2000);
                page = await pager.next();
            }
        }

        console.log(`finished school ${hsId}, ${results.length} rows`);

        return results;
    }

    public async exportStudentCourses(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        const schoolId = Object.keys(input.outputs)[0];
        const hsMapping = this.job.steps['findSchools'].output!['hsMapping'] as { [dsId: string]: string[]};
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

        if (input.parameters!['highschools']) {
            highschoolsToProcess = highschoolsToProcess.filter(
                (hsId) => input.parameters!['highschools'].includes(hsId));
        }
        console.log(`district ${schoolId} processing schools ${highschoolsToProcess}`);

        if (input.parameters!['customHeaders']) {
            this.customHeaders = input.parameters!['customHeaders'].filter((h: string) => this.headers.includes(h));
        } else {
            this.customHeaders = this.headers;
        }

        const numCourseRows = input.parameters!['rowPerPlan'] ? input.parameters!['numCourseRows'] || 30 : 0;
        if (input.parameters!['rowPerPlan']) {
            for (let i = 0; i < numCourseRows; i++) {
                this.customHeaders.push(`Course${i + 1}_ID`);
                this.customHeaders.push(`Course${i + 1}_Grade`);
                this.customHeaders.push(`Course${i + 1}_Name`);
            }
        }

        this.writeOutputRow(input.outputs[schoolId].writeStream, this.customHeaders);

        const chunkSize = 6;
        const chunks = Array.from({ length: Math.ceil(highschoolsToProcess.length / chunkSize) }, (_v, i) =>
            highschoolsToProcess.slice(i * chunkSize, i * chunkSize + chunkSize),
        );

        for (const [idx, chunk] of chunks.entries()) {
            console.log(`processing chunk ${idx + 1} of ${chunks.length}`);
            const promises: Promise<string[][]>[] = [];
            for (const hsId of chunk) {
                promises.push(this.processHighschool(schoolId, hsId, numCourseRows));
            }

            const results = await Promise.all(promises);
            for (const [hsIdx, rows] of results.entries()) {
                for (const row of rows) {
                    this.writeOutputRow(input.outputs[schoolId].writeStream, row);
                }
                this.coursesExported[chunk[hsIdx]] = rows.length;
            }
        }

        return {};
    }

    public async after_exportStudentCourses(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        return { results: {
            coursesExported: this.coursesExported
        }};
    }
}
