import {Annotations, ChuteToObject, Course, Namespace, RulesRepository, SlimStudentPlan} from "@academic-planner/apSDK";
import {Job, JobStatus} from "@data-channels/dcSDK";
import {StudentCourseExportProcessor} from "./StudentCourseExportProcessor";
import 'jest';


describe( 'StudentCourseExportProcessor', () => {
    test( 'exportStudentCourses', async () => {
        RulesRepository.init({
            url: '',
            jwt: '',
            product: 'foo'
        });
        const job = Job.fromConfig(jobConfig);
        const processor = new StudentCourseExportProcessor(job);
        const customHeaders = ["Highschool_ID","Highschool_Name","Student_ID","Class_Year","First_Name","Last_Name","Student_Plan_ID","Plan_Type","Plan_Name","Grade","Alternate_Course","Course_ID","Course_Name","Course_Subject","SCED_Code","CSSC_Code","Course_Active","Is_Planned", "Global_Alternate_Course", "Alternate_Priority"]
        const splan = {guid: "guid", studentPrincipleId: "studentId", created: '1968-11-16T00:00:00',
            courses: [
                {"built":true,"number":"AST1977","unique":"AST1977","credits":0.5,"planned":true,"mandated":false,"gradeLevel":10,"auditIdentifier":"AST1977__3","statementUnique":"387e0084-73df-48db-8d4a-05f8f80331bc_stmt0_take_list0",
                record: {priorityInAlternateRequirement: 99, isUsedByAlternateRequirement: true}}
            ]};

        // @ts-ignore
        processor.studentsById = {studentId: [{isActive: true, classYear: 2020}]}; // act like a fixture
        // @ts-ignore
        processor.findCourse = async (namespace: Namespace, scopeAsNamespace: Namespace, name: string): Promise<Course | null> => {
            const course = new Course("name", "display");
            course.annotations = Annotations.simple({subjectArea: "sub_area"});

            return course;
        }; // mocking the catalog course
        const result = await processor.rowsFromSlimPlan(
            'studentId',
            splan as unknown as SlimStudentPlan,
            customHeaders,
            new Namespace("namespace"),
            "hsId",
            false,
            false,
            undefined,
            undefined
            );

        expect(result[0][18]).toEqual("1"); // is used by alternate requirement
        expect(result[0][19]).toEqual("99"); // alternate priority

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
    },
    noTaskLogs: false
};

const mockCourse = {
    "display": "display",
    "type": "COURSE",
    "statements": [],
    "name": "1005502",
    "fileGuid": "18c43c0d-6334-4054-956b-ac09c471ca14",
    "versionGuid": "c4e451dc-f02d-45cb-be34-367bd14fa14b",
    "namespace": "naviance.2617970DUS.courses",
    "annotations": {
        "grades": {
            "value": [
                9,
                10,
                11,
                12
            ],
            "operator": "=",
            "annotationId": "LIST_INTEGER"
        },
        "status": {
            "value": "ACTIVE",
            "operator": "=",
            "annotationId": "COURSE_STATUS"
        },
        "credits": {
            "value": 0.5,
            "operator": "=",
            "annotationId": "DECIMAL"
        },
        "schools": {
            "value": [
                "19808USPU",
                "134472USPU"
            ],
            "operator": "=",
            "annotationId": "LIST_STRING"
        }
    },
    "status": "ACTIVE"
}
