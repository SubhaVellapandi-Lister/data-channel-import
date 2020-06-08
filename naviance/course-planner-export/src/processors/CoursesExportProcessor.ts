import {
    Course,
    Namespace
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import _ from "lodash";
import { initServices, sleep } from "../Utils";

interface IExportParameters {
    tenantId: string;
    namespace?: string;
    active?: boolean;
}

const headers = [
    'District_ID',
    'School_ID',
    'School_Name',
    'Course_ID',
    'Subject',
    'Course_Name'
];

export class CoursesExportProcessor extends BaseProcessor {
    public async before_exportCourses(input: IStepBeforeInput) {
        initServices(input.parameters!);
    }

    public async exportCourses(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        this.writeOutputRow(
            input.outputs['Courses'].writeStream,
            headers
        );

        const params = input.parameters! as IExportParameters;
        const districtId = params.namespace || params.tenantId;
        const namespace = new Namespace(districtId);
        const schoolNamesById = this.job.steps['findSchools'].output!['schoolNames'] || {};

        const pager = Course.find(namespace);

        let page: Course[] = [];
        let totalCourses = 0;

        try {
            page = await pager.page(1);
        }   catch (err) {
            console.log('ERROR GETTING COURSE PAGE, RETRYING...');
            await sleep(1000);
            page = await pager.page(1);
        }

        while (page.length > 0) {
            for (const course of page) {
                const status = course.annotations.getValue('status') as string;
                if (status !== 'ACTIVE' && params.active) {
                    continue;
                }

                const subject = course.annotations.getValue('subjectArea') as string;
                const [subName, cssc, sced] = (subject || '__').split('_');

                const schools = course.annotations.getValue('schools') as string[];
                if (!schools || !schools.length) {
                    continue;
                }

                for (const schoolId of schools) {
                    const schoolName = schoolNamesById[schoolId] || '';
                    this.writeOutputRow(
                        input.outputs['Courses'].writeStream,
                        [districtId, schoolId, schoolName, course.name, subName, course.display]
                    );
                }
                totalCourses += 1;
            }

            try {
                page = await pager.next();
            } catch (err) {
                console.log('ERROR GETTING COURSE PAGE, RETRYING...');
                await sleep(1000);
                page = await pager.next();
            }
        }

        return {
            results: { totalCourses }
        };
    }
}
