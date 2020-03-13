import {
    Course,
    Namespace
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterInput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import _ from "lodash";
import { getRowVal, initServices } from "./Utils";

interface IExportParameters {
    tenantId: string;
}

const headers = [
    'Course_ID',
    'School_ID'
];

export class MappingExportProcessor extends BaseProcessor {
    private localIdByNavId: { [key: string]: string } = {};

    public async before_exportMappings(input: IStepBeforeInput) {
        initServices(input.parameters!);
    }

    // main call just loads in school ID mapping from previous step
    public async exportMappings(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            return {
                outputs: {}
            };
        }

        const locSchoolId = getRowVal(input.data, 'Local_School_ID') || '';
        const navSchoolId = getRowVal(input.data, 'Naviance_School_ID') || '';
        this.localIdByNavId[navSchoolId] = locSchoolId;

        return {
            outputs: {}
        };
    }

    public async after_exportMappings(input: IStepAfterInput): Promise<IStepAfterOutput> {
        const params = input.parameters! as IExportParameters;
        let mappingsExported = 0;

        this.writeOutputRow(input.outputs['Mappings'].writeStream, headers);

        const coursePager = Course.find(new Namespace(params.tenantId), { pageSize: 200 });

        let page = await coursePager.page(1);

        while (page.length) {
            for (const course of page) {
                const schools = course.annotations.getValue('schools') as string[];
                if (schools && schools.length) {
                    const courseId: any = course.annotations.getValue('id') || course.name;
                    for (const navSchoolId of schools) {
                        this.writeOutputRow(
                            input.outputs['Mappings'].writeStream,
                            [courseId, this.localIdByNavId[navSchoolId] || '']
                        );
                        mappingsExported += 1;
                    }
                }
            }

            page = await coursePager.next();
        }

        return { results: {
            mappingsExported
        }};
    }
}
