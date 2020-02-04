import { ICourseRecord, IPlan } from "@academic-planner/academic-planner-common";
import {
    Course,
    Namespace,
    Program,
    RawStorage,
    SlimStudentPlan,
    StudentPlan
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterInput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { INavianceStudent, INavianceStudentIDMap, readStudents} from "./Student";
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
        'Last_Name',
        'First_Name',
        'Class_Year',
        'Student_Plan_ID',
        'Student_Last_Update_Date',
        'Status',
        'Plan_Type',
        'Plan_Name',
        'Pathway_Name',
        'Cluster_Name',
        'Grade',
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
    private studentsById: INavianceStudentIDMap = {};
    private academicYear: number = 0;
    private pathwayNameHeader = 'Pathway_Name';
    private clusterNameHeader = 'Cluster_Name';

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

    private studentRec(studentId: string): INavianceStudent | null {
        if (!this.studentsById[studentId]) {
            return null;
        }
        for (const rec of this.studentsById[studentId]) {
            if (rec.isActive) {
                return rec;
            }
        }

        return null;
    }

    private courseAcademicYear(studentId: string, course: ICourseRecord): number {
        const student = this.studentRec(studentId);

        const curDate = new Date();
        const curYear = new Date().getFullYear();
        const july15 = new Date(`7/15/${curYear}`);
        const curGradYear = curDate > july15 ? curYear + 1 : curYear;

        if (!student || !student.classYear || student.classYear < curGradYear) {
            return 0;
        }

        return student.classYear - (13 - (course.gradeLevel! as number));
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
                const student = this.studentRec(splan.studentPrincipleId);

                if (!student) {
                    continue;
                }

                const filteredCourses = splan.courses!
                    .filter((crec) =>
                        !this.academicYear ||
                        this.courseAcademicYear(splan.studentPrincipleId, crec as ICourseRecord) === this.academicYear);

                if (!filteredCourses.length) {
                    continue;
                }
                let programName = '';
                let clusterName = '';
                let pathwayName = '';
                for (const progRef of splan.programs || []) {
                    const program = await this.findProgram(namespace, progRef.name);
                    if (!program) {
                        console.log(`Could not find program ${progRef.name}`);
                        continue;
                    }
                    const progName = (program.annotations.getValue('name') || '').toString() || program.display;
                    const clusterId = program.annotations.getValue('clusterId');
                    if (clusterId) {
                        pathwayName = progName;
                        const cluster = await this.findProgram(namespace, clusterId as string);
                        if (cluster) {
                            clusterName = (cluster.annotations.getValue('name') || '').toString() || cluster.display;
                        }
                    } else {
                        programName = progName;
                    }
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
                    Student_ID: student.sisId || splan.studentPrincipleId,
                    Last_Name: student!.lastName || '',
                    First_Name: student!.firstName || '',
                    Class_Year: student!.classYear!.toString() || '',
                    Student_Plan_ID: splan.guid,
                    Plan_Name: programName,
                    [this.clusterNameHeader]: clusterName,
                    [this.pathwayNameHeader]: pathwayName,
                    Status: studentPlanStatus,
                    Plan_Type: studentPlanType,
                    Highschool_Name: this.schoolNamesById[hsId] || student.highschoolName || '',
                    Student_Last_Update_Date: updateDate.toISOString(),
                    Grade: filteredCourses[0].gradeLevel!.toString()
                };

                const courseRowData: object[] = [];

                for (const record of filteredCourses) {
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

    // main call just loads in student data from prior naviance export step
    public async exportStudentCourses(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
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

    public async after_exportStudentCourses(input: IStepAfterInput): Promise<IStepAfterOutput> {
        if (input.parameters!['academicYear']) {
            this.academicYear = input.parameters!['academicYear'];
        }

        const schoolId = input.parameters!['tenantId'];
        const parentId = input.parameters!['namespace'] || schoolId;
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

        const namespace = new Namespace(parentId);

        if (input.parameters!['customHeaders']) {
            this.customHeaders = input.parameters!['customHeaders'].filter((h: string) => this.headers.includes(h));
        } else {
            this.customHeaders = this.headers;
        }

        const config = await RawStorage.findOne({namespace, itemName: parentId});
        if (config && config.json) {
            const labels = config.json['labels'] || {};
            if (labels['pathway'] && this.customHeaders.includes('Pathway_Name')) {
                this.pathwayNameHeader = `${labels['pathway']}_Name`;
                this.customHeaders[this.customHeaders.indexOf('Pathway_Name')] = this.pathwayNameHeader;
            }
            if (labels['cluster'] && this.customHeaders.includes('Cluster_Name')) {
                this.clusterNameHeader = `${labels['cluster']}_Name`;
                this.customHeaders[this.customHeaders.indexOf('Cluster_Name')] = this.clusterNameHeader;
            }
        }

        const numCourseRows = input.parameters!['rowPerPlan'] ? input.parameters!['numCourseRows'] || 30 : 0;
        if (input.parameters!['rowPerPlan']) {
            for (let i = 0; i < numCourseRows; i++) {
                this.customHeaders.push(`Course${i + 1}_ID`);
                this.customHeaders.push(`Course${i + 1}_Name`);
            }
        }

        console.log(JSON.stringify({
            highschools: highschoolsToProcess,
            numCourseRows,
            schoolId,
            students: Object.keys(this.studentsById).length,
            academicYear: this.academicYear,
            headers: this.customHeaders,
            parentId
        }, undefined, 2));

        this.writeOutputRow(input.outputs['Export'].writeStream, this.customHeaders);

        const chunkSize = 6;
        const chunks = Array.from({ length: Math.ceil(highschoolsToProcess.length / chunkSize) }, (_v, i) =>
            highschoolsToProcess.slice(i * chunkSize, i * chunkSize + chunkSize),
        );

        for (const [idx, chunk] of chunks.entries()) {
            console.log(`processing chunk ${idx + 1} of ${chunks.length}`);
            const promises: Promise<string[][]>[] = [];
            for (const hsId of chunk) {
                promises.push(this.processHighschool(parentId, hsId, numCourseRows));
            }

            const results = await Promise.all(promises);
            for (const [hsIdx, rows] of results.entries()) {
                for (const row of rows) {
                    this.writeOutputRow(input.outputs['Export'].writeStream, row);
                }
                this.coursesExported[chunk[hsIdx]] = rows.length;
            }
        }

        return { results: {
            coursesExported: this.coursesExported
        }};
    }
}
