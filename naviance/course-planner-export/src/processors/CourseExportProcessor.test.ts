import { RulesRepository } from "@academic-planner/apSDK";
import { Job, JobStatus } from "@data-channels/dcSDK";
import stringify from "csv-stringify";
import 'jest';
import { CoursesExportProcessor} from "./CoursesExportProcessor";
import { csvReadableToStrings } from "../Utils";

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
        const writeStream = stringify();
        const result = await processor['exportCourses']({
            parameters: {
                tenantId: '9999000USPU',
                namespace: '999911111DUS'
            },
            inputs: {},
            outputs: {
                Courses: {
                    writeStream,
                    bucket: '',
                    key: '',
                    uploadResponsePromise: {} as any
                }
            }
        });

        expect(result).toEqual({
            results: {
                totalCourses: 2
            }
        });

        writeStream.end();
        const resultRows = await csvReadableToStrings(writeStream);

        expect(resultRows).toEqual([
            [
                "District_ID",
                "School_ID",
                "School_Name",
                "Course_ID",
                "Subject",
                "Course_Name"
            ],
            [
                "999911111DUS",
                "111",
                "Some School 1",
                "MyCourse101",
                "something",
                "A basic course",
            ],
            [
                "999911111DUS",
                "222",
                "Some School 2",
                "MyCourse101",
                "something",
                "A basic course",
            ],
            [
                "999911111DUS",
                "111",
                "Some School 1",
                "MyCourse102",
                "something",
                "Another course",
            ],
            [
                "999911111DUS",
                "222",
                "Some School 2",
                "MyCourse102",
                "something",
                "Another course",
            ]
        ]);
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
                schoolNames: {
                    '111': 'Some School 1',
                    '222': 'Some School 2'
                }
            }
        },
        exportCourses: {
            finished: false,
        }
    }
};
