import { RulesRepository } from "@academic-planner/apSDK";
import { Job, JobStatus } from "@data-channels/dcSDK";
import stringify from "csv-stringify";
import 'jest';
import { CoursesExportProcessor} from "./CoursesExportProcessor";

jest.mock('@academic-planner/apSDK');

describe( 'CourseExportProcessor', () => {
    test( 'exportCourses', async () => {
        RulesRepository.init({
            url: '',
            jwt: '',
            product: 'foo'
        });
        const job = Job.fromConfig(jobConfig);
        const processor = new CoursesExportProcessor(job);
        const result = await processor['exportCourses']({
            parameters: {
                tenantId: '9999000USPU',
                namespace: '999911111DUS'
            },
            inputs: {},
            outputs: {
                Courses: {
                    writeStream: stringify(),
                    bucket: '',
                    key: '',
                    uploadResponsePromise: {} as any
                }
            }
        });

        expect(result).toEqual({
            outputs: {
                totalCourses: 2
            }
        });
    });
});

const jobConfig = {
    guid: 'some-guid-here',
    created: new Date(),
    name: 'some-job',
    isDeleted: false,
    currentStep: 'exportCourses',
    status: JobStatus.Started,
    statusMsg: '',
    channel: {
        guid: 'some-channel-guid-here',
        name: 'some-channel'
    },
    filesIn: [],
    filesOut: [],
    steps: {
        findSchools: {
            finished: true,
            output: {
                schoolNames: {}
            }
        },
        exportCourses: {
            finished: false,
        }
    }
};
