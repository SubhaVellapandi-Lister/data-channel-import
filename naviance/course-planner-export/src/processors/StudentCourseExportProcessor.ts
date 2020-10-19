import { ICourseRecord } from "@academic-planner/academic-planner-common";
import {
    Course,
    FindPlansWithStudentNamePager,
    FindStudentPlanPager,
    IFindStudentPlanCriteria,
    Namespace,
    PlanContext,
    Program,
    ProgramReference,
    RawStorage,
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
import {PlanAudit} from "../PlanAudit";
import { INavianceStudent, INavianceStudentIDMap } from "../Student";
import { initServices, sleep } from "../Utils";

interface IHsMap {
    [hsId: string]: string[];
}

interface IExportParameters {
    exports: IExportMap;
    tenantId: string;
    academicYear?: number;
    academicYearOrGreater?: boolean;
    planOfStudyId?: string;
    planStatus?: string;
    highschools?: string[];
    namespace?: string;
    parallelSchools?: number;
    pageSize?: number;
    notGraduated?: boolean;
}

interface IExportMap {
    [name: string]: IExportConfig;
}

enum ExportMode {
    Audit = 'audit',
    Course = 'course'
}

interface IExportConfig {
    mode: ExportMode;
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

interface IProgramTrio {
    pos?: Program;
    cluster?: Program;
    pathway?: Program;
}

interface ISchoolExportNumbers {
    [name: string]: number;
}

function booleanToString(item: any) {
    return item ? 'TRUE' : 'FALSE';
}

const auditHeaders = [
    'Tenant_ID',
    'GUID',
    'Plan_Name',
    'Student_ID',
    'Author_ID',
    'Created_Date',
    'Updated_Date',
    'Status',
    'Approval_Requirement',
    'Pathway_Label',
    'Cluster_Label',
    'Is_Active',
    'Plan_Of_Study_Name',
    'Plan_Of_Study_ID',
    'Plan_Of_Study_Is_Published',
    'Cluster_Name',
    'Cluster_ID',
    'Pathway_Name',
    'Pathway_ID',
    'Pathway_Is_Published',
    'Num_Requirements_Met',
    'Num_Requirements_Total',
    'Requirements_All_Met',
    'Required_Credits_Total',
    'Required_Credits_Remaining',
    'Credit_Deficiency',
    'Completed_Credits',
    'Completed_Credits_Used',
    'Planned_Credits',
    'Planned_Credits_Used',
    'PoS_Num_Requirements_Met',
    'PoS_Num_Requirements_Total',
    'PoS_Requirements_All_Met',
    'PoS_Required_Credits_Total',
    'PoS_Required_Credits_Remaining',
    'PoS_Credit_Deficiency',
    'PoS_Completed_Credits',
    'PoS_Completed_Credits_Used',
    'PoS_Planned_Credits',
    'PoS_Planned_Credits_Used',
    'Pathway_Num_Requirements_Met',
    'Pathway_Num_Requirements_Total',
    'Pathway_Requirements_All_Met',
    'Pathway_Required_Credits_Total',
    'Pathway_Required_Credits_Remaining',
    'Pathway_Credit_Deficiency',
    'Pathway_Completed_Credits',
    'Pathway_Completed_Credits_Used',
    'Pathway_Planned_Credits',
    'Pathway_Planned_Credits_Used',
    'Planned_Courses',
    'Completed_Courses'
];

const courseHeaders = [
    'Highschool_ID',
    'Highschool_Name',
    'Selected_Highschool_ID',
    'Selected_Highschool_Name',
    'Target_Highschool_ID',
    'Target_Highschool_Name',
    'Student_ID',
    'Last_Name',
    'First_Name',
    'Counselor_ID',
    'Counselor_Name',
    'Class_Year',
    'Student_Plan_ID',
    'Student_Last_Update_Date',
    'Status',
    'Plan_Type',
    'Plan_Name',
    'Pathway_Name',
    'Cluster_Name',
    'Grade',
    'Is_Planned',
    'Alternate_Course',
    'Course_ID',
    'Course_Name',
    'Course_Subject',
    'Course_Active',
    'SCED_Code',
    'CSSC_Code',
    'Instructional_Level',
    'Global_Alternate_Course',
    'Alternate_Priority'
];

export class StudentCourseExportProcessor extends BaseProcessor {
    private courseByName: { [name: string]: Course | null } = {};
    private coursesExported: { [exportName: string]: ISchoolExportNumbers } = {};
    private programsByName: { [name: string]: Program } = {};
    private schoolNamesById: { [id: string]: string } = {};
    private studentsById: INavianceStudentIDMap = {};
    private pathwayNameHeader = 'Pathway_Name';
    private clusterNameHeader = 'Cluster_Name';
    private configItems: { [name: string]: string } = {};
    private curSchoolProcessCount = 0;
    private parallelSchools = 8;
    private pageSize = 100;
    private districtAssignedIds: { [navId: string]: string } = {};

    private async findProgram(namespace: Namespace, scopeAsNamespace: Namespace, name: string): Promise<Program> {

        async function doFind() {
            let prog = await Program.findOne({
                namespace, itemName: name
            });
            if (!prog) {
                prog = await Program.findOne({
                    namespace: scopeAsNamespace, itemName: name
                });
            }

            return prog;
        }

        if (this.programsByName[name] === undefined) {
            let fullProg: Program | null;
            try {
                fullProg = await doFind();
            } catch (err) {
                console.log('ERROR GETTING PROGRAM, RETRYING...');
                await sleep(2000);
                fullProg = await doFind();
            }

            if (!fullProg) {
                console.log(`Could not find program ${name}`);
            }
            this.programsByName[name] = fullProg!;
        }

        return this.programsByName[name];
    }

    private programDisplayName(program: Program | undefined): string {
        if (!program) {
            return '';
        }

        return (program.annotations.getValue('name') || '').toString() || program.display;
    }

    private async findProgramsForPlan(
        namespace: Namespace, scopeAsNamespace: Namespace, refs: ProgramReference[]
    ): Promise<IProgramTrio> {
        const trio: IProgramTrio = {};
        for (const progRef of refs) {
            const program = await this.findProgram(namespace, scopeAsNamespace, progRef.name);
            if (!program) {
                continue;
            }
            const clusterId = program.annotations.getValue('clusterId');
            if (clusterId) {
                const cluster = await this.findProgram(namespace, scopeAsNamespace, clusterId as string);
                trio.cluster = cluster;
                trio.pathway = program;
            } else {
                trio.pos = program;
            }
        }

        return trio;
    }

    private async findCourse(namespace: Namespace, scopeAsNamespace: Namespace, name: string): Promise<Course | null> {

        async function doFind() {
            let c = await Course.findOne({
                namespace, itemName: name
            });
            if (!c) {
                c = await Course.findOne({
                    namespace: scopeAsNamespace, itemName: name
                });
            }

            return c;
        }

        if (this.courseByName[name] === undefined) {
            let course: Course | null;
            try {
                course = await doFind();
            } catch (err) {
                console.log('ERROR GETTING COURSE, RETRYING...');
                await sleep(2000);
                course = await doFind();
            }

            if (!course) {
                console.log(`could not find course ${name}}`);
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
            if (rec && rec.isActive) {
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

        const gradeLevel = (course.gradeLevel as number) || course.numericGrade || 0;

        return student.classYear - (13 - gradeLevel);
    }

    private async auditColumns(
        plan: SlimStudentPlan, posProgram: Program, clusterProgram?: Program, pathwayProgram?: Program
    ): Promise<object> {
        const audit = plan.audits!;
        const gradedRecIds: string[] = audit.studentRecords
            .filter((srec) => (srec.record as ICourseRecord).grade !== undefined)
            .map((srec) => srec.identifier);

        let clusterName = '';
        let clusterId = '';
        if (clusterProgram) {
            clusterId = clusterProgram.guid!;
            clusterName = (clusterProgram.annotations.getValue('name') || '').toString();
        }
        const columns = {
            Plan_Of_Study_Name: '',
            Plan_Of_Study_ID: '',
            Plan_Of_Study_Is_Published: '',
            Cluster_Name: clusterName,
            Cluster_ID: clusterId,
            Pathway_Name: '',
            Pathway_ID: '',
            Pathway_Is_Published: '',
            Num_Requirements_Met: audit.progress.statementsMet.toString(),
            Num_Requirements_Total: audit.progress.statementsTotal.toString(),
            Requirements_All_Met: (audit.progress.statementsMet === audit.progress.statementsTotal).toString(),
            Required_Credits_Total: (audit.progress.creditsRequired || 0).toString(),
            Required_Credits_Remaining: (audit.progress.creditsRemaining || 0).toString(),
            PoS_Num_Requirements_Met: '',
            PoS_Num_Requirements_Total: '',
            PoS_Requirements_All_Met: '',
            PoS_Required_Credits_Total: '',
            PoS_Required_Credits_Remaining: '',
            PoS_Credit_Deficiency: 'FALSE',
            PoS_Completed_Credits_Used: '',
            PoS_Planned_Credits_Used: '',
            PoS_Completed_Credits: "0", // need to tweak once we are storing course histories
            PoS_Planned_Credits: '',
            Pathway_Num_Requirements_Met: '',
            Pathway_Num_Requirements_Total: '',
            Pathway_Requirements_All_Met: '',
            Pathway_Required_Credits_Total: '',
            Pathway_Required_Credits_Remaining: '',
            Pathway_Credit_Deficiency: 'FALSE',
            Pathway_Completed_Credits_Used: '',
            Pathway_Planned_Credits_Used: '',
            Pathway_Completed_Credits: "0", // need to tweak once we are storing course histories
            Pathway_Planned_Credits: ''
        };

        let planTotalCreditsRequired = 0;

        function setProgSpecificCols(program: Program, prefix: string) {
            const programIndex = audit.rawAudit.programs.findIndex((progDet) => progDet.program.name === program.name);
            if (programIndex < 0) {
                return 0;
            }
            const rawAudit = audit.rawAudit.programs[programIndex];
            if (!rawAudit) {
                return 0;
            }
            const programAudit = plan.audits ? plan.audits.programDetails[programIndex] : null;
            const statements = rawAudit.program.statements;
            let statementsMet = 0;
            let creditsTotal = 0;
            for (const stmt of statements) {
                if (stmt.auditResult.isMet) {
                    statementsMet += 1;
                }
                let foundAnnoCreds = false;
                if (stmt.with) {
                    for (const withItem of stmt.with) {
                        if (withItem.name === 'credits' && withItem.value) {
                            const credits = parseFloat(withItem.value.toString());
                            if (credits) {
                                creditsTotal += credits;
                            }
                            foundAnnoCreds = true;
                            break;
                        }
                    }
                }
                if (!foundAnnoCreds) {
                    creditsTotal += stmt.auditResult.creditProgress.creditsRequired || 0;
                }
            }
            planTotalCreditsRequired += creditsTotal;
            const plannedCredits = PlanAudit.creditsInPlan(programAudit);
            /* if (plannedCredits === 0) {
                if (programAudit) {
                    console.log(plan.studentPrincipleId, programAudit.calculateCreditTotals());
                    console.log(programAudit.requirements.map(
                        (req) =>
                            req.calculateCreditTotals().totalCreditsRequiredMinusAttempted,
                    ));
                }
            } */

            const completedCredits = rawAudit.program.auditResult.usedRecords
                .filter((rec) => gradedRecIds[rec.studentRecordId])
                .map((rec) => rec.creditsUsed)
                .reduce((credA, credB) => credA + credB, 0);

            const namePrefix = prefix === 'PoS' ? 'Plan_Of_Study' : prefix;

            columns[`${namePrefix}_Name`] = (program.annotations.getValue('name') || '').toString();
            columns[`${namePrefix}_ID`] = program.guid;
            columns[`${namePrefix}_Is_Published`] = booleanToString(program.annotations.getValue('published'));
            columns[`${prefix}_Num_Requirements_Met`] = statementsMet.toString();
            columns[`${prefix}_Num_Requirements_Total`] = statements.length.toString();
            columns[`${prefix}_Required_Credits_Remaining`] = (audit.progress.creditsRemaining || 0).toString();
            columns[`${prefix}_Required_Credits_Total`] = creditsTotal.toString();
            columns[`${prefix}_Requirements_All_Met`] = booleanToString(PlanAudit.isAllMet(programAudit));
            columns[`${prefix}_Completed_Credits_Used`] = rawAudit.progress.credits.creditsGradedUsed.toString();
            columns[`${prefix}_Completed_Credits`] = completedCredits.toString();
            columns[`${prefix}_Planned_Credits_Used`] = rawAudit.progress.credits.creditsPlannedUsed.toString();
            columns[`${prefix}_Planned_Credits`] = plannedCredits.toString();
        }

        setProgSpecificCols(posProgram, 'PoS');

        if (pathwayProgram) {
            setProgSpecificCols(pathwayProgram, 'Pathway');
        }

        columns.Required_Credits_Total = planTotalCreditsRequired.toString();

        return columns;
    }

    private async auditRowsFromPlan(
        studentId: string, plan: SlimStudentPlan, headers: string[],
        namespace: Namespace, scopeAsNamespace: Namespace, hsId: string
    ): Promise<string[]> {
        const planVersion = plan.latestVersionSummary!;
        const audit = plan.audits!;
        const meta = plan.meta || {};
        let planName =  meta['name'] || '';
        let planStatus = meta['status'] || '';
        let isActive = meta['isActive'] || '';
        for (const ctx of plan.contexts || []) {
            const pContext = ctx as PlanContext;
            if (!pContext.product) {
                continue;
            }
            if (!planName && pContext.product['name']) {
                planName = pContext.product['name'];
            }
            if (!planStatus && pContext.product['status']) {
                planStatus = pContext.product['status'];
            }
            if (isActive === '' && pContext.product['isActive']) {
                isActive = pContext.product['isActive'].toString();
            }
        }

        const plannedCreditTotal = audit.studentRecords
            .map((rec) => (rec.record as ICourseRecord).credits)
            .reduce((credA, credB) => credA + credB, 0);

        const rowData = {
            Tenant_ID: hsId,
            GUID: plan.guid,
            Plan_Name: planName,
            Student_ID:  studentId,
            Author_ID:  plan.authorPrincipleId,
            Created_Date: plan.created.toISOString(),
            Updated_Date: planVersion.created,
            Status: planStatus,
            Is_Active: isActive,
            Credit_Deficiency: 'FALSE',
            Completed_Credits_Used: audit.progress.creditsCompleted.toString(),
            Planned_Credits_Used: audit.progress.creditsInPlan.toString(),
            Completed_Credits: "0", // need to tweak once we are storing course histories
            Planned_Credits: plannedCreditTotal.toString(),
            Planned_Courses: plan.courses!.map((course) => course.number).join(', '),
            Course_History: '' // need to tweak once we are storing course histories
        };

        const programs = await this.findProgramsForPlan(namespace, scopeAsNamespace, plan.programs || []);

        if (!programs.pos) {
            return [];
        }

        try {
            Object.assign(rowData, await this.auditColumns(
                plan, programs.pos, programs.cluster, programs.pathway));
        } catch (error) {
            console.log(`Error ${hsId} - ${plan.guid}`);
            console.log(error);

            return [];
        }
        Object.assign(rowData, this.configItems);

        const flatRow: string[] = headers.map((headerName) => (rowData[headerName] || '').toString());

        return flatRow;
    }

    async rowsFromSlimPlan(
        studentId: string, splan: SlimStudentPlan, headers: string[],
        namespace: Namespace, hsId: string, expandCourses: boolean, currentOnly: boolean,
        academicYear: number | undefined, academicYearOrGreater: boolean | undefined
    ): Promise<string[][]> {
        const results: string[][] = [];

        const scopeAsNamespace = new Namespace(`namespace.${hsId}`);

        const studentRequired = headers.includes('Last_Name') ||
            headers.includes('First_Name') ||
            headers.includes('Class_Year');

        const student = this.studentRec(splan.studentPrincipleId);

        if (!student && studentRequired) {
            console.log(`student not found ${splan.studentPrincipleId}`);

            return [];
        }

        const filteredCourses = splan.courses!
            .filter((crec) =>
                !academicYear ||
                this.courseAcademicYear(splan.studentPrincipleId, crec as ICourseRecord) === academicYear ||
                (
                    academicYearOrGreater &&
                    this.courseAcademicYear(splan.studentPrincipleId, crec as ICourseRecord) > academicYear
                )
            );

        if (!filteredCourses.length) {
            console.log(`no filtered courses, ${splan.guid} ${academicYear}, ${splan.courses}`);
            console.log(splan.courses!.map((crec) => [
                crec.number, crec.gradeLevel, this.courseAcademicYear(splan.studentPrincipleId, crec as ICourseRecord)]
            ));

            return [];
        }

        const programs = await this.findProgramsForPlan(
            namespace, scopeAsNamespace, splan.programs || []
        );
        let studentPlanStatus = '';
        let selectedHighschoolId = hsId;
        if (splan.meta) {
            studentPlanStatus = (splan.meta['status'] as string) || '';
            selectedHighschoolId = (splan.meta['schoolId'] as string) || selectedHighschoolId;
        }
        let studentPlanType = 'draft';
        let updateDate = new Date(splan.created);
        if (splan.meta) {
            studentPlanType = splan.meta['isActive'] ? 'current' : 'draft';
            if (splan.meta['lastEdited']) {
                updateDate = new Date(splan.meta['lastEdited'] as number);
            }
        }

        if (currentOnly && studentPlanType === 'draft') {
            return [];
        }

        const studentHighschool = student && student.highschoolName ? student.highschoolName : '';
        const selectedHighschool = this.schoolNamesById[selectedHighschoolId] || studentHighschool;

        const planData = {
            Highschool_ID: hsId,
            Selected_Highschool_ID: selectedHighschoolId,
            Target_Highschool_ID: this.districtAssignedIds[selectedHighschoolId] || selectedHighschoolId,
            Student_ID: studentId,
            Last_Name: student ? student.lastName : '',
            First_Name: student ? student.firstName : '',
            Class_Year: student ? student.classYear!.toString() : '',
            Counselor_ID: student ? (student.counselorId || '').toString() : '',
            Counselor_Name: student ? student.counselorName || '' : '',
            Student_Plan_ID: splan.guid,
            Plan_Name: this.programDisplayName(programs.pos),
            [this.clusterNameHeader]: this.programDisplayName(programs.cluster),
            [this.pathwayNameHeader]: this.programDisplayName(programs.pathway),
            Status: studentPlanStatus,
            Plan_Type: studentPlanType,
            Highschool_Name: this.schoolNamesById[hsId] || studentHighschool,
            Selected_Highschool_Name: selectedHighschool,
            Target_Highschool_Name: selectedHighschool,
            Student_Last_Update_Date: updateDate.toISOString(),
            Grade: (filteredCourses[0].gradeLevel || '').toString()
        };

        const courseRowData: object[] = [];

        for (const record of filteredCourses) {
            const course = await this.findCourse(namespace, scopeAsNamespace, record.number);
            if (!course) {
                continue;
            }

            const subject = course.annotations.getValue('subjectArea') as string;
            const [subName, cssc, sced] = subject.split('_');
            const instLevel = (course.annotations.getValue('instructionalLevel') || '') as string;
            const active = course.annotations.getValue('status') === 'ACTIVE';
            const courseYear = this.courseAcademicYear(splan.studentPrincipleId, record as ICourseRecord);
            const globalAlternateCourse = record?.record?.isUsedByAlternateRequirement === true ? 1 : 0;
            const alternatePriority = typeof record?.record?.priorityInAlternateRequirement === 'number' ? record?.record?.priorityInAlternateRequirement : '';

            courseRowData.push({
                Grade: (record.gradeLevel || record.numericGrade || '').toString(),
                Course_ID: record.number,
                Course_Name: course.display,
                Course_Subject: subName,
                Course_Active: booleanToString(active),
                Alternate_Course: booleanToString(false),
                SCED_Code: sced,
                CSSC_Code: cssc,
                Instructional_Level: instLevel,
                Is_Planned: `${courseYear}-${courseYear + 1}`,
                Global_Alternate_Course: globalAlternateCourse,
                Alternate_Priority: alternatePriority
            });
        }

        if (expandCourses) {
            // column per course record
            const allCourseCols = {};
            for (const [idx, courseData] of courseRowData.entries()) {
                allCourseCols[`Course${idx + 1}_ID`] = courseData['Course_ID'];
                allCourseCols[`Course${idx + 1}_Name`] = courseData['Course_Name'];
            }
            const rowData = Object.assign(allCourseCols, planData);
            const flatRow = headers.map((headerName) => (rowData[headerName] || '').toString());
            results.push(flatRow);
        } else {
            for (const courseData of courseRowData) {
                const rowData = Object.assign(planData, courseData);
                const flatRow = headers.map((headerName) => (rowData[headerName] || '').toString());
                results.push(flatRow);
            }
        }

        return results;
    }

    public async before_exportStudentCourses(input: IStepBeforeInput) {
        initServices(input.parameters!);
    }

    private async processHighschool(
        dsId: string, hsId: string, params: IExportParameters
    ): Promise<{ [name: string]: string[][] }> {

        const scopeAsNamespace = new Namespace(`naviance.${hsId}`);
        const startSleepSeconds = new Date().getTime() / 1000;
        while (this.curSchoolProcessCount >= this.parallelSchools) {
            await sleep(1000);

            const waitSeconds = (new Date().getTime() / 1000) - startSleepSeconds;
            if (waitSeconds > 600) {
                // fire sale, gotta try to finish before time runs out
                break;
            }
        }
        this.curSchoolProcessCount += 1;

        console.log(`processing school ${hsId}`);
        const namespace = new Namespace(dsId);
        const resultsByExport: { [name: string]: string[][] } = {};

        let expand = 'courses,programs,contexts';
        for (const exportConf of Object.values(params.exports)) {
            if (exportConf.mode === ExportMode.Audit) {
                expand = 'courses,programs,audits,contexts';
            }
        }

        const findCriteria: IFindStudentPlanCriteria = {};

        if (params.planOfStudyId) {
            const programs = await Program.find(namespace).all();
            for (const prog of programs) {
                if (prog.guid === params.planOfStudyId) {
                    findCriteria.program = { name: prog.name };
                }
            }
            if (!findCriteria.program) {
                console.log('program not found', params.planOfStudyId);
            }
        }
        if (params.planStatus) {
            findCriteria.meta = {
                status: params.planStatus
            };
        }

        const processPageOfPlans = async (page: SlimStudentPlan[]) => {
            if (params.notGraduated) {
                // filter out plans for students that have already graduated
                let cutoffYear = new Date().getFullYear();
                if (new Date().getMonth() > 6) {
                    cutoffYear += 1;
                }
                const filteredPage: SlimStudentPlan[] = [];
                for (const splan of page) {
                    const student = this.studentRec(splan.studentPrincipleId);
                    if (student && (!student.classYear || student.classYear! >= cutoffYear)) {
                        filteredPage.push(splan);
                    }
                }
                page = filteredPage;
                console.log(`filtering plan page to ${filteredPage.length}`);
            }

            for (const splan of page) {
                for (const [exportName, exportConf] of Object.entries(params.exports)) {
                    if (!resultsByExport[exportName]) {
                        resultsByExport[exportName] = [];
                    }

                    let studentId = splan.studentPrincipleId;
                    if (exportConf.sisStudentId) {
                        const student = this.studentRec(studentId);
                        if (student && student.sisId) {
                            studentId = student.sisId;
                        }
                    }

                    const academicYear = params.academicYear || exportConf.academicYear;
                    const academicYearOrGreater = params.academicYearOrGreater || exportConf.academicYearOrGreater;

                    if (exportConf.mode === ExportMode.Course) {
                        const rowsFromPlan = await this.rowsFromSlimPlan(
                            studentId,
                            splan,
                            exportConf.headersToWrite!,
                            namespace,
                            hsId,
                            exportConf.rowPerPlan === true,
                            exportConf.currentPlansOnly === true,
                            academicYear,
                            academicYearOrGreater
                        );
                        resultsByExport[exportName] = resultsByExport[exportName].concat(
                            rowsFromPlan.filter((row) => row.length > 0)
                        );
                    }
                    if (exportConf.mode === ExportMode.Audit) {
                        const rowsFromPlan = await this.auditRowsFromPlan(
                           studentId,
                           splan,
                           exportConf.headersToWrite!,
                           namespace,
                           scopeAsNamespace,
                           hsId
                        );
                        if (rowsFromPlan.length) {
                            resultsByExport[exportName].push(rowsFromPlan);
                        }
                    }
                }
            }

            return resultsByExport;
        };

        const processPager = async (pager: FindStudentPlanPager | FindPlansWithStudentNamePager) => {
            let page: SlimStudentPlan[];
            try {
                page = await pager.page(1);
            } catch (err) {
                console.log('ERROR GETTING FIRST PAGE OF PLANS, RETRYING...');
                await sleep(2000);
                page = await pager.page(1);
            }

            while (page.length) {
                console.log(`processing page of ${page.length} plans ${hsId}`);
                await processPageOfPlans(page);
                try {
                    page = await pager.next();
                } catch {
                    console.log('ERROR GETTING NEXT PAGE OF PLANS, RETRYING...');
                    await sleep(2000);
                    page = await pager.next();
                }
            }
        };

        const numStudents = Object.keys(this.studentsById).length;
        const allPlansPager = StudentPlan.find(`naviance.${hsId}`, { expand, pageSize: this.pageSize, findCriteria });
        const numPlans = await allPlansPager.total();

        if (numStudents < numPlans) {
            // search for plans by student ID in chunks
            const studentIds = Object.keys(this.studentsById);
            const chunkSize = 25;
            const idChunks =  Array.from({ length: Math.ceil(studentIds.length / chunkSize) }, (_v, i) =>
                studentIds.slice(i * chunkSize, i * chunkSize + chunkSize),
            );

            for (const [idx, chunk] of idChunks.entries()) {
                console.log(`processing student ID chunk ${idx + 1} of ${idChunks.length}`);

                const pager = StudentPlan.find(
                    `naviance.${hsId}`,
                    {
                        expand,
                        pageSize: this.pageSize,
                        findCriteria: Object.assign({ studentPrincipleId: chunk }, findCriteria)
                    }
                );
                await processPager(pager);
            }
        } else {
            // search for all plans
            await processPager(allPlansPager);
        }

        console.log(`finished school ${hsId}`);

        this.curSchoolProcessCount -= 1;

        return resultsByExport;
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
            }
        }

        if (params.highschools) {
            highschoolsToProcess = highschoolsToProcess.filter(
                (hsId) => params.highschools!.includes(hsId));
        }

        return highschoolsToProcess;
    }

    private async writeHeaders(parentId: string, params: IExportParameters, outputs: IOutputByName) {
        const namespace = new Namespace(parentId);
        for (const [exportName, exportConf] of Object.entries(params.exports)) {

            let baseHeaders = courseHeaders;
            if (exportConf.mode === ExportMode.Audit) {
                baseHeaders = auditHeaders;
            }

            let headersToWrite = baseHeaders;
            if (exportConf.customHeaders) {
                headersToWrite = exportConf.customHeaders.filter((h: string) => baseHeaders.includes(h));
            }

            const config = await RawStorage.findOne({namespace, itemName: parentId});
            if (config && config.json) {
                const labels = config.json['labels'] || {};
                if (exportConf.rewriteHeaderLabels) {
                    if (labels['pathway'] && headersToWrite.includes('Pathway_Name')) {
                        this.pathwayNameHeader = `${labels['pathway']}_Name`;
                        headersToWrite[headersToWrite.indexOf('Pathway_Name')] = this.pathwayNameHeader;
                    }
                    if (labels['cluster'] && headersToWrite.includes('Cluster_Name')) {
                        this.clusterNameHeader = `${labels['cluster']}_Name`;
                        headersToWrite[headersToWrite.indexOf('Cluster_Name')] = this.clusterNameHeader;
                    }
                }

                this.configItems = {
                    Approval_Requirement: config.json['approvalRequirement'] || '',
                    Pathway_Label: labels['pathway'] || '',
                    Cluster_Label: labels['cluster'] || ''
                };

            }

            const numCourseRows = exportConf.rowPerPlan ? exportConf.numCourseCols || 30 : 0;
            if (exportConf.rowPerPlan) {
                for (let i = 0; i < numCourseRows; i++) {
                    headersToWrite.push(`Course${i + 1}_ID`);
                    headersToWrite.push(`Course${i + 1}_Name`);
                }
            }

            params.exports[exportName].headersToWrite = headersToWrite;

            this.writeOutputRow(outputs[exportName].writeStream, headersToWrite);
        }
    }

    public async after_exportStudentCourses(input: IStepAfterInput): Promise<IStepAfterOutput> {
        const params = input.parameters! as IExportParameters;

        const schoolId = params.tenantId;
        const parentId = params.namespace || schoolId;
        const highschoolsToProcess = this.parseHsToProcess(params);

        console.log(`district ${schoolId} processing schools ${highschoolsToProcess}`);

        this.parallelSchools = params.parallelSchools || 8;
        this.pageSize = params.pageSize || 100;
        this.districtAssignedIds = this.job.steps['findSchools'].output!['schoolAssignedIDs'] || {};
        this.schoolNamesById = this.job.steps['findSchools'].output!['schoolNames'] || {};

        await this.writeHeaders(parentId, params, input.outputs);

        /*const chunkSize = params.parallelSchools || 8;
        const chunks = Array.from({ length: Math.ceil(highschoolsToProcess.length / chunkSize) }, (_v, i) =>
            highschoolsToProcess.slice(i * chunkSize, i * chunkSize + chunkSize),
        );

        for (const [idx, chunk] of chunks.entries()) {
            console.log(`processing chunk ${idx + 1} of ${chunks.length}`);
            const promises: Promise<{ [name: string]: string[][] }>[] = [];
            for (const hsId of chunk) {
                promises.push(this.processHighschool(parentId, hsId, params));
            }*/

        const promises: Promise<{ [name: string]: string[][] }>[] = [];
        for (const hsId of highschoolsToProcess) {
            promises.push(this.processHighschool(parentId, hsId, params));
        }

        const results = await Promise.all(promises);
        for (const [hsIdx, exportResults] of results.entries()) {
            for (const [exportName, rows] of Object.entries(exportResults)) {
                for (const row of rows) {
                    this.writeOutputRow(input.outputs[exportName].writeStream, row);
                }
                if (!this.coursesExported[exportName]) {
                    this.coursesExported[exportName] = {};
                }
                this.coursesExported[exportName][highschoolsToProcess[hsIdx]] = rows.length;
            }
        }

        return { results: {
            coursesExported: this.coursesExported
        }};
    }
}
