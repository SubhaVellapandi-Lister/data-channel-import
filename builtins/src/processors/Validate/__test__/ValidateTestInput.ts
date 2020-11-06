import { Job, JobStatus } from "@data-channels/dcSDK";

import { Validate } from "../Validate";

export const userFileInfo = {
    key: "users.csv",
    bucket: "sfdev",
};
export const sectionsFileInfo = {
    key: "sections.csv",
    bucket: "sfdev",
};
export const enrollmentFileInfo = {
    key: "enrollment.csv",
    bucket: "sfdev",
};
export const studentCourseFileInfo = {
    key: "studentCourse.csv",
    bucket: "sfdev",
};
export const validateConfig = {
    parameters: {
        validateConfig: {
            users: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    family_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    middle_name: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                    },
                    given_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                    },
                    email: {
                        required: true,
                        validTypes: ["email"],
                        invalidIfBlank: false,
                    },
                    secondary_email: {
                        required: false,
                        validTypes: ["email"],
                        invalidIfBlank: false,
                    },
                    user_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    gender: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validValues: ["M", "F", "U", "MALE", "FEMALE", "UNKNOWN"],
                        caseInSensitive: true,
                    },
                    available_ind: {
                        required: true,
                        validTypes: ["integer"],
                        invalidIfBlank: true,
                        validValues: ["1", "0"],
                    },
                    assign_student_role: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"],
                    },
                    allow_login: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"],
                    },
                },
                includeDataInLog: true,
                includeLogInData: true,
                discardInvalidRows: false,
            },
            sections: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    course_section_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    course_section_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    start_dt: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: "YYYY-MM-DD",
                        compareField: "current_date",
                        comparator: "lt",
                    },
                    end_dt: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: "YYYY-MM-DD",
                        compareField: "start_dt",
                        comparator: "gt",
                    },
                    term_id: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                    },
                    course_integration_id: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                    },
                    course_section_delivery: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validvalues: ["01", "02", "03", "99"],
                    },
                },
                includeDataInLog: true,
                includeLogInData: true,
                discardInvalidRows: false,
            },
            enrollment: {
                columns: {
                    course_section_integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    user_integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    user_role: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                        validValues: ["STUDENT", "INSTRUCTOR", "TA"],
                    },
                    available_ind: {
                        required: true,
                        validTypes: ["integer"],
                        invalidIfBlank: true,
                        validValues: ["1", "0"],
                    },
                    last_access_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: "YYYY-MM-DD HH:MM:SS",
                    },
                    authoritative_status: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["01", "02", "03", "04", "05", "06"],
                    },
                },
                includeDataInLog: true,
                includeLogInData: true,
                discardInvalidRows: false,
            },
            studentCourse: {
                columns: {
                    student_course_start_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: "YYYYMMDD",
                        compareField: "student_course_end_date",
                        comparator: "ltEq",
                    },
                    student_course_end_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: "YYYYMMDD",
                        compareField: "student_course_start_date",
                        comparator: "gtEq",
                    },
                    mob: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: "HH:MM A",
                    },
                    par_student_start_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: "YYYYMM",
                    },
                    par_student_end_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: "YYYYMMDD",
                        compareField: "par_student_end_date",
                        comparator: "eq",
                    },
                    birth_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: "YYYY-MM-DD HH:MM:SS",
                    },
                    email: {
                        required: false,
                        validTypes: ["email"],
                        invalidIfBlank: false,
                    },
                },
                includeDataInLog: true,
                includeLogInData: true,
                discardInvalidRows: false,
            },
        },
        dynamicOutput: true,
        dynamicInput: true,
    },
};

export const validateConfigLogExcluded = {
    parameters: {
        validateConfig: {
            users: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    family_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    middle_name: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                    },
                    given_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                    },
                    email: {
                        required: true,
                        validTypes: ["email"],
                        invalidIfBlank: false,
                    },
                    secondary_email: {
                        required: false,
                        validTypes: ["email"],
                        invalidIfBlank: false,
                    },
                    user_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    gender: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validValues: ["M", "F", "U", "MALE", "FEMALE", "UNKNOWN"],
                    },
                    available_ind: {
                        required: true,
                        validTypes: ["integer"],
                        invalidIfBlank: true,
                        validValues: ["1", "0"],
                    },
                    assign_student_role: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"],
                    },
                    allow_login: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"],
                    },
                },
                includeDataInLog: true,
                discardInvalidRows: true,
            },
        },
    },
};

export const validateConfigWithLogHeaders = {
    parameters: {
        validateConfig: {
            users: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    family_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    middle_name: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                    },
                    given_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                    },
                    email: {
                        required: true,
                        validTypes: ["email"],
                        invalidIfBlank: false,
                    },
                    secondary_email: {
                        required: false,
                        validTypes: ["email"],
                        invalidIfBlank: false,
                    },
                    user_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    gender: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validValues: ["M", "F", "U", "MALE", "FEMALE", "UNKNOWN"],
                    },
                    available_ind: {
                        required: true,
                        validTypes: ["integer"],
                        invalidIfBlank: true,
                        validValues: ["1", "0"],
                    },
                    assign_student_role: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"],
                    },
                    allow_login: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"],
                    },
                },
                includeDataInLog: true,
                includeLogInData: false,
                logHeaders: ["integration_id"],
                discardInvalidRows: true,
            },
            relationships: {
                columns: {
                    parent_integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    parent_role: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    child_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    child_role: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                        validValues: ["STUDENT", "BASIC USER", "INSTRUCTOR", "TA"],
                    },
                    term_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                },
                includeDataInLog: true,
                includeLogInData: false,
                logHeaders: ["logData"],
                discardInvalidRows: true,
            },
        },
    },
};

export const usersHeaderInputRow = {
    index: 1,
    name: "users",
    raw: ["integration_id", "family_name", "given_name", "email", "user_id", "available_ind", "secondary_email"],
    data: {
        integration_id: "integration_id",
        family_name: "family_name",
        given_name: "given_name",
        email: "email",
        user_id: "user_id",
        available_ind: "available_ind",
        secondary_email: "secondary_email",
    },
    fileInfo: userFileInfo,
};

export const usersHeaderInputRowWithMissingColumn = {
    index: 1,
    name: "users",
    fileInfo: userFileInfo,
    raw: ["family_name", "given_name", "email", "user_id", "available_ind", "secondary_email"],
    data: {
        family_name: "family_name",
        given_name: "given_name",
        email: "email",
        user_id: "user_id",
        available_ind: "available_ind",
        secondary_email: "secondary_email",
    },
};

export const usersDataInputRowWithMissingValue = {
    index: 2,
    raw: ["goldnew", "yolandanew", "testusernew@gmail.com", "ygold_test", "1", "testusernew@gmail.com"],
    data: {
        family_name: "goldnew",
        given_name: "yolandanew",
        email: "testusernew@gmail.com",
        user_id: "ygold_test",
        available_ind: "1",
        secondary_email: "testusernew@gmail.com",
    },
    json: ["goldnew", "yolandanew", "testusernew@gmail.com", "ygold_test", "1", "testusernew@gmail.com"],
    name: "users",
    fileInfo: userFileInfo,
};

export const usersDataRowWithInvalidEmail = {
    index: 2,
    raw: ["Yolanda.Gold", "goldnew", "yolandanew", "testusernewgmail.com", "ygold_test", "1", "testusernewgmail.com"],
    data: {
        integration_id: "Yolanda.Gold",
        family_name: "goldnew",
        given_name: "yolandanew",
        email: "testusernewgmail.com",
        user_id: "ygold_test",
        available_ind: "1",
        secondary_email: "testusernewgmail.com",
    },
    json: ["Yolanda.Gold", "goldnew", "yolandanew", "testusernewgmail.com", "ygold_test", "1", "testusernewgmail.com"],
    name: "users",
    fileInfo: userFileInfo,
};

export const usersDataRowWithValidEmail = {
    index: 2,
    raw: ["Yolanda.Gold", "goldnew", "yolandanew", "testusernew@gmail.com", "ygold_test", "1", "testusernew@gmail.com"],
    data: {
        integration_id: "Yolanda.Gold",
        family_name: "goldnew",
        given_name: "yolandanew",
        email: "testusernew@gmail.com",
        user_id: "ygold_test",
        available_ind: "1",
        secondary_email: "testusernew@gmail.com",
    },
    json: ["Yolanda.Gold", "goldnew", "yolandanew", "testusernew@gmail.com", "ygold_test", "1", "testusernew@gmail.com"],
    name: "users",
    fileInfo: userFileInfo,
};

export const usersDataRowWithInvalidValue = {
    index: 2,
    raw: [
        "Yolanda.Gold",
        "goldnew",
        "yolandanew",
        "testusernew@gmail.com",
        "ygold_test",
        "12345",
        "testusernew@gmail.com",
    ],
    data: {
        integration_id: "Yolanda.Gold",
        family_name: "goldnew",
        given_name: "yolandanew",
        email: "testusernew@gmail.com",
        user_id: "ygold_test",
        available_ind: "12345",
        secondary_email: "testusernew@gmail.com",
    },
    json: [
        "Yolanda.Gold",
        "goldnew",
        "yolandanew",
        "testusernew@gmail.com",
        "ygold_test",
        "12345",
        "testusernew@gmail.com",
    ],
    name: "users",
    fileInfo: userFileInfo,
};

export const sectionsHeaderInputRowWithDate = {
    index: 1,
    name: "sections",
    fileInfo: sectionsFileInfo,
    raw: [
        "integration_id",
        "course_section_name",
        "course_section_id",
        "start_dt",
        "end_dt",
        "term_id",
        "course_integration_id",
        "course_section_delivery",
    ],
    data: {
        integration_id: "integration_id",
        course_section_name: "course_section_name",
        course_section_id: "course_section_id",
        start_dt: "start_dt",
        end_dt: "end_dt",
        term_id: "term_id",
        course_integration_id: "course_integration_id",
        course_section_delivery: "course_section_delivery",
    },
};

export const sectionsDataRowWithDatetimeValue = {
    index: 2,
    raw: [
        "UNIV-SRF101-602-202002",
        "Canvas Course",
        "UNIV-SRF101-602-202002",
        "2020-08-10",
        "2021-01-10",
        "202002",
        "SRF101",
        "03",
    ],
    data: {
        integration_id: "UNIV-SRF101-602-202002",
        course_section_name: "Canvas Course",
        course_section_id: "UNIV-SRF101-602-202002",
        start_dt: "2020-08-10",
        end_dt: "2021-01-10",
        term_id: "202002",
        course_integration_id: "SRF101",
        course_section_delivery: "03",
    },
    json: [
        "UNIV-SRF101-602-202002",
        "Canvas Course",
        "UNIV-SRF101-602-202002",
        "2020-08-10",
        "2021-01-10",
        "202002",
        "SRF101",
        "03",
    ],
    name: "sections",
    fileInfo: sectionsFileInfo,
};

export const enrollmentHeaderInputRowWithDifferentDateFormat = {
    index: 1,
    name: "enrollment",
    fileInfo: enrollmentFileInfo,
    raw: [
        "course_section_integration_id",
        "user_integration_id",
        "user_role",
        "available_ind",
        "credit_hours",
        "last_access_date",
        "authoritative_status",
    ],
    data: {
        course_section_integration_id: "course_section_integration_id",
        user_integration_id: "user_integration_id",
        user_role: "user_role",
        available_ind: "available_ind",
        credit_hours: "credit_hours",
        last_access_date: "last_access_date",
        authoritative_status: "authoritative_status",
    },
};

export const enrollmentDataRowWithDifferentDateFormatValue = {
    index: 2,
    raw: ["UNIV-SRF101-602-202002", "Yolanda.Gold", "INSTRUCTOR", "1", "1.5", "2016-09-20 14:04:05", "01"],
    data: {
        course_section_integration_id: "UNIV-SRF101-602-20200",
        user_integration_id: "Yolanda.Gold",
        user_role: "INSTRUCTOR",
        available_ind: "1",
        credit_hours: "1.5",
        last_access_date: "2016-09-20 14:04:05",
        authoritative_status: "01",
    },
    json: ["UNIV-SRF101-602-202002", "Yolanda.Gold", "INSTRUCTOR", "1", "1.5", "2016-09-20 14:04:05", "01"],
    name: "enrollment",
    fileInfo: enrollmentFileInfo,
};

export const sectionsDataRowWithInvalidDateFormat = {
    index: 2,
    raw: [
        "UNIV-SRF101-602-202002",
        "Canvas Course",
        "UNIV-SRF101-602-202002",
        "10-12-2020",
        "2021-01-10",
        "202002",
        "SRF101",
        "03",
    ],
    data: {
        integration_id: "UNIV-SRF101-602-202002",
        course_section_name: "Canvas Course",
        course_section_id: "UNIV-SRF101-602-202002",
        start_dt: "10-12-2020",
        end_dt: "2021-01-10",
        term_id: "202002",
        course_integration_id: "SRF101",
        course_section_delivery: "03",
    },
    json: [
        "UNIV-SRF101-602-202002",
        "Canvas Course",
        "UNIV-SRF101-602-202002",
        "10-12-2020",
        "2021-01-10",
        "202002",
        "SRF101",
        "03",
    ],
    name: "sections",
    fileInfo: sectionsFileInfo,
};

export const validateConfigWithWarning = {
    parameters: {
        validateConfig: {
            users: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    family_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    middle_name: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                    },
                    given_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                    },
                    email: {
                        required: true,
                        validTypes: ["email"],
                        invalidIfBlank: false,
                    },
                    secondary_email: {
                        required: false,
                        validTypes: ["email"],
                        invalidIfBlank: false,
                    },
                    user_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                    },
                    gender: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validValues: ["M", "F", "U", "MALE", "FEMALE", "UNKNOWN"],
                    },
                    available_ind: {
                        required: true,
                        validTypes: ["integer"],
                        invalidIfBlank: true,
                        validWithWarningValues: ["12345"],
                        validValues: ["1", "0"],
                    },
                    assign_student_role: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"],
                    },
                    allow_login: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"],
                    },
                },
                includeDataInLog: true,
                includeLogInData: true,
                discardInvalidRows: false,
            },
        },
    },
};

export const usersHeaderInputRowForCaseInSensitiveValidation = {
    index: 1,
    name: "users",
    fileInfo: userFileInfo,
    raw: [
        "integration_id",
        "family_name",
        "given_name",
        "email",
        "user_id",
        "available_ind",
        "secondary_email",
        "gender",
    ],
    data: {
        integration_id: "integration_id",
        family_name: "family_name",
        given_name: "given_name",
        email: "email",
        user_id: "user_id",
        available_ind: "available_ind",
        secondary_email: "secondary_email",
        gender: "gender",
    },
};

export const userDataRowWithCaseInSensitiveValue = {
    index: 2,
    raw: [
        "ygold",
        "goldnew",
        "yolandanew",
        "testusernew@gmail.com",
        "ygold_test",
        "1",
        "testusernew@gmail.com",
        "FeMale",
    ],
    data: {
        integration_id: "ygold",
        family_name: "goldnew",
        given_name: "yolandanew",
        email: "testusernew@gmail.com",
        user_id: "ygold_test",
        available_ind: "1",
        secondary_email: "testusernew@gmail.com",
        gender: "FeMale",
    },
    json: [
        "ygold",
        "goldnew",
        "yolandanew",
        "testusernew@gmail.com",
        "ygold_test",
        "1",
        "testusernew@gmail.com",
        "FeMale",
    ],
    name: "users",
    fileInfo: userFileInfo,
};

const jobConfig = {
    guid: "some-guid-here",
    created: new Date(),
    name: "some-job",
    isDeleted: false,
    currentStep: "validate",
    flow: ["validate"],
    status: JobStatus.Started,
    statusMsg: "",
    channel: {
        guid: "some-channel-guid-here",
        name: "some-channel",
    },
    filesIn: [
        {
            s3: { key: "ready/manualimports/piiMask/users.csv", bucket: "sfdev" },
            name: "users",
        },
    ],
    filesOut: [{ s3: { key: "users", bucket: "" }, name: "users_1" }],
    steps: {
        validate: {
            finished: false,
        },
    },
};

export const studentCourseHeaderInputRowWithDate = {
    index: 1,
    name: "studentCourse",
    fileInfo: studentCourseFileInfo,
    raw: [
        "institution_id",
        "integration_id",
        "student_course_start_date",
        "student_course_end_date",
        "mob",
        "par_student_start_date",
        "par_student_end_date",
        "birth_date",
        "email",
    ],
    data: {
        institution_id: "institution_id",
        integration_id: "integration_id",
        student_course_start_date: "student_course_start_date",
        student_course_end_date: "student_course_end_date",
        mob: "mob",
        par_student_start_date: "par_student_start_date",
        par_student_end_date: "par_student_end_date",
        birth_date: "birth_date",
        email: "email",
    },
};

export const studentCourseDataRowWithDatetimeValue = {
    index: 2,
    raw: [
        "100001",
        "UNIV-SRF101-602-202002",
        "20200810",
        "20200810",
        "10:30AM",
        "202011",
        "20201201",
        "2020-01-23 10:30:00",
        "",
    ],
    data: {
        institution_id: "100001",
        integration_id: "UNIV-SRF101-602-202002",
        student_course_start_date: "20200810",
        student_course_end_date: "20200810",
        mob: "10:30AM",
        par_student_start_date: "202011",
        par_student_end_date: "20201201",
        birth_date: "2020-01-23 10:30:00",
        email: "",
    },
    json: [
        "100001",
        "UNIV-SRF101-602-202002",
        "20200810",
        "20200810",
        "10:30AM",
        "202011",
        "20201201",
        "2020-01-23 10:30:00",
        "",
    ],
    name: "studentCourse",
    fileInfo: studentCourseFileInfo,
};
export const studentCourseDataRowWithInvalidDatetimeValue = {
    index: 2,
    raw: [
        "100001",
        "UNIV-SRF101-602-202002",
        "202810",
        "2020080",
        "10.30AM",
        "20211",
        "2020121",
        "2020-01-2310:30:00",
        "testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest@test.com",
    ],
    data: {
        institution_id: "100001",
        integration_id: "UNIV-SRF101-602-202002",
        student_course_start_date: "202810",
        student_course_end_date: "2020080",
        mob: "10.30AM",
        par_student_start_date: "20211",
        par_student_end_date: "2020121",
        birth_date: "2020-01-2310:30:00",
        email: "testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest@test.com",
    },
    json: [
        "100001",
        "UNIV-SRF101-602-202002",
        "202810",
        "2020080",
        "10.30AM",
        "20211",
        "2020121",
        "2020-01-2310:30:00",
        "testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest@test.com",
    ],
    name: "studentCourse",
    fileInfo: studentCourseFileInfo,
};
export const studentCourseDataRowWithInvalidDatetime = {
    index: 2,
    raw: [
        "100001",
        "UNIV-SRF101-602-202002",
        "20200810",
        "20200810",
        "10:30AM",
        "202011",
        "20201201",
        "2010-02-28 10:70:00",
    ],
    data: {
        institution_id: "100001",
        integration_id: "UNIV-SRF101-602-202002",
        student_course_start_date: "20200810",
        student_course_end_date: "20200810",
        mob: "10:30AM",
        par_student_start_date: "202011",
        par_student_end_date: "20201201",
        birth_date: "2010-02-28 10:70:00",
    },
    json: [
        "100001",
        "UNIV-SRF101-602-202002",
        "20200810",
        "20200810",
        "10:30AM",
        "202011",
        "20201201",
        "2010-02-28 10:70:00",
    ],
    name: "studentCourse",
    fileInfo: studentCourseFileInfo,
};
export function getValidateProcessor(): Validate {
    const validateProcessor = new Validate(Job.fromConfig(jobConfig));
    validateProcessor.createOutput = jest.fn().mockReturnValue(``);
    validateProcessor.createInput = jest.fn().mockReturnValue(``);

    return validateProcessor;
}
