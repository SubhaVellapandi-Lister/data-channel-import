import { ICourseRecord, IPlan } from "@academic-planner/academic-planner-common";
import {
    Course,
    Namespace,
    RawStorage, SlimStudentPlan, StudentPlan
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { initServices } from "./Utils";

interface IPlanSet {
    slim: SlimStudentPlan;
    full?: StudentPlan;
}

export class StudentCourseExportProcessor extends BaseProcessor {
    private headers = [
        'Highschool_ID',
        'Student_ID',
        'Plan_GUID',
        'Plan_Name',
        'Grade_Level',
        'Course_ID',
        'Course_Name',
        'Course_Subject',
        'SCED_Code',
        'CSSC_Code',
        'Instructional_Level'
    ];
    private courseByName: { [name: string]: Course | null } = {};

    private async findCourse(namespace: Namespace, name: string): Promise<Course | null> {
        if (!this.courseByName[name]) {
            const course = await Course.findOne({
                namespace, itemName: name
            });

            this.courseByName[name] = course;
        }

        return this.courseByName[name];
    }

    private booleanToString(item: any) {
        return item ? 'TRUE' : 'FALSE';
    }

    public async before_exportPlans(input: IStepBeforeInput) {
        initServices(input.parameters!);
    }

    private async getFullPlan(slim: SlimStudentPlan): Promise<IPlanSet> {
        try {
            const full = await slim.toStudentPlan();

            return { slim, full};

        } catch (err) {
            return { slim };
        }
    }

    private async processHighschool(
        dsId: string, hsId: string, configItems: { [name: string]: string }
    ): Promise<string[][]> {

        const namespace = new Namespace(dsId);
        const results: string[][] = [];
        const pager = StudentPlan.find(`naviance.${hsId}`, { expand: 'courses' });
        let page = await pager.page(1);

        const sleep = (milliseconds: number) => {
            return new Promise((resolve) => setTimeout(resolve, milliseconds));
        };



        console.log(`got first page ${page.length}`);
        while (page.length) {
            for (const splan of page) {
                for (const record of splan.courses || []) {
                    const course = await this.findCourse(namespace, record.number);
                    if (!course) {
                        continue;
                    }

                    const subject = course.annotations.getValue('subjectArea') as string;
                    const [subName, cssc, sced] = subject.split('_');
                    const instLevel = (course.annotations.getValue('instructionalLevel') || '') as string;

                    const rowData = {
                        Highschool_ID: hsId,
                        Student_ID: splan.studentPrincipleId,
                        Student_Plan_ID: splan.guid,
                        Grade_Level: (record.gradeLevel || '').toString(),
                        Course_ID: record.number,
                        Course_Name: course.display,
                        Course_Subject: subName,
                        SCED_Code: sced,
                        CSSC_Code: cssc,
                        Instructional_Level: instLevel
                    };
                    const flatRow = this.headers.map((headerName) => (rowData[headerName] || '').toString());
                    results.push(flatRow);
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

        return results;
    }

    public async exportCourses(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        const schoolId = Object.keys(input.outputs)[0];
        const hsMapping = this.job.steps['findSchools'].output!['hsMapping'] as { [dsId: string]: string[]};
        let highschoolsToProcess = [schoolId];
        if (hsMapping[schoolId]) {
            highschoolsToProcess = hsMapping[schoolId];
        }
        console.log(`district ${schoolId} processing schools ${highschoolsToProcess}`);

        this.writeOutputRow(input.outputs[schoolId].writeStream, this.headers);

        this.programsByName = {};

        const namespace = new Namespace(schoolId);
        const config = await RawStorage.findOne({namespace, itemName: schoolId });
        let configItems: { [name: string]: string } = {};
        if (config && config.json) {
            const labels = config.json['labels'] || {};
            configItems = {
                Approval_Requirement: config.json['approvalRequirement'] || '',
                Pathway_Label: labels['pathway'] || '',
                Cluster_Label: labels['cluster'] || ''
            };
        }

        for (const hsId of highschoolsToProcess) {
            console.log(`processing school ${hsId}`);

            const results = await this.processHighschool(schoolId, hsId, configItems);

            console.log(`finished ${hsId}`);
            for (const flatRow of results) {
                this.writeOutputRow(input.outputs[schoolId].writeStream, flatRow);
            }
            this.plansExported[hsId] = results.length;
        }

        return {};
    }

    public async after_exportPlans(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        return { results: {
            plansExported: this.plansExported
        }};
    }
}
