import {
    Course,
    Namespace
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IStepAfterInput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import _ from "lodash";
import { getRowVal, initServices, sleep } from "./Utils";

interface IExportParameters {
    tenantId: string;
    namespace?: string;
    active?: boolean;
}

const headers = [
    'School_ID',
    'Course_ID',
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
        const schoolId = params.namespace || params.tenantId;
        const namespace = new Namespace(schoolId);

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

                this.writeOutputRow(
                    input.outputs['Courses'].writeStream,
                    [schoolId, course.name, course.display]
                );
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
