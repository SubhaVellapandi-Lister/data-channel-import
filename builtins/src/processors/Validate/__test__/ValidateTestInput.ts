import { ConfigType, IJobConfig, JobStatus, jobWithInlineChannel } from "@data-channels/dcSDK";

import { Validate } from "../Validate";

export const userFileInfo = {
    key: "users.csv",
    bucket: "sfdev"
};
export const sectionsFileInfo = {
    key: "sections.csv",
    bucket: "sfdev"
};
export const enrollmentFileInfo = {
    key: "enrollment.csv",
    bucket: "sfdev"
};
export const studentCourseFileInfo = {
    key: "studentCourse.csv",
    bucket: "sfdev"
};
export const testScoreFileInfo = {
    key: "testScore.csv",
    bucket: "sfdev"
};

export const invalidMultiFileConfig = {
    parameters: {
        multipleFileConfig: true,
        dynamicOutput: true,
        dynamicInput: true
    }
};

export const invalidConfig = {
    parameters: {
        dynamicOutput: true,
        dynamicInput: true
    }
};

export const invalidColumnsConfig = {
    parameters: {
        dynamicOutput: true,
        dynamicInput: true,
        validateConfig: {
            columns: {
                someColumn: {
                    range: {
                        min: 0
                    }
                }
            }
        }
    }
};

export const validateConfig = {
    parameters: {
        multipleFileConfig: true,
        fileValidateConfig: {
            users: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    family_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    middle_name: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    given_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    email: {
                        required: true,
                        validTypes: ["email"],
                        warnIfBlank: true
                    },
                    secondary_email: {
                        required: false,
                        validTypes: ["email"],
                        invalidIfBlank: false,
                        warnIfNotValidValue: true
                    },
                    user_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    gender: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validValues: ["M", "F", "U", "MALE", "FEMALE", "UNKNOWN"],
                        caseInSensitive: true
                    },
                    available_ind: {
                        required: true,
                        validTypes: ["integer"],
                        invalidIfBlank: true,
                        validValues: ["1", "0"]
                    },
                    assign_student_role: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"]
                    },
                    allow_login: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"]
                    }
                },
                includeDataInLog: true,
                includeLogInData: true,
                discardInvalidRows: false
            },
            sections: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    course_section_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    course_section_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    start_dt: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYY-MM-DD"],
                        compareField: "current_date",
                        comparator: "lt"
                    },
                    end_dt: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYY-MM-DD"],
                        compareField: "start_dt",
                        comparator: "gt"
                    },
                    term_id: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    course_integration_id: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    course_section_delivery: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validvalues: ["01", "02", "03", "99"]
                    }
                },
                includeDataInLog: true,
                includeLogInData: true,
                discardInvalidRows: false
            },
            enrollment: {
                columns: {
                    course_section_integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    user_integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    user_role: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                        validValues: ["STUDENT", "INSTRUCTOR", "TA"]
                    },
                    available_ind: {
                        required: true,
                        validTypes: ["integer"],
                        invalidIfBlank: true,
                        validValues: ["1", "0"]
                    },
                    last_access_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYY-MM-DD HH:MM:SS"]
                    },
                    authoritative_status: {
                        required: false,
                        validTypes: ["decimal"],
                        invalidIfBlank: false,
                        validValues: ["0.1", "0.2", "0.3", "0.4", "0.5", "0.6"]
                    },
                    is_on_probation: {
                        required: false,
                        validTypes: ["boolean"],
                        invalidIfBlank: false
                    },
                    batch_year: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYY"],
                        compareField: "invalid_date_column",
                        comparator: "invalid operator"
                    },
                    invalid_date_column: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["invalid format"]
                    },
                    invalid_type_column: {
                        required: false,
                        validTypes: ["invalid_type"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["invalid format"],
                        validWithWarningTypes: true
                    }
                },
                includeDataInLog: true,
                includeLogInData: true,
                discardInvalidRows: false
            },
            studentCourse: {
                columns: {
                    student_course_start_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYYMMDD"],
                        compareField: "student_course_end_date",
                        comparator: "ltEq"
                    },
                    student_course_end_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYYMMDD"],
                        compareField: "student_course_start_date",
                        comparator: "gtEq"
                    },
                    course_period_start_time: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["HH:MM A"],
                        compareField: "course_period_end_time",
                        comparator: "lt"
                    },
                    course_period_end_time: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["HH:MM A"],
                        compareField: "course_period_start_time",
                        comparator: "gt"
                    },
                    mob: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["HH:MM A"]
                    },
                    par_student_start_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYYMM"]
                    },
                    par_student_end_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYYMMDD"],
                        compareField: "par_student_end_date",
                        comparator: "eq"
                    },
                    birth_date: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYY-MM-DD HH:MM:SS"]
                    },
                    email: {
                        required: false,
                        validTypes: ["email"],
                        invalidIfBlank: false
                    }
                },
                includeDataInLog: true,
                includeLogInData: true,
                discardInvalidRows: false
            }
        },
        dynamicOutput: true,
        dynamicInput: true,
        warnIfNotValidValue: true,
        writeErrorDataToJobMeta: true
    }
};

export const validateConfigLogExcluded = {
    parameters: {
        multipleFileConfig: true,
        fileValidateConfig: {
            users: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    family_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    middle_name: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    given_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    email: {
                        required: true,
                        validTypes: ["email"],
                        invalidIfBlank: false
                    },
                    secondary_email: {
                        required: false,
                        validTypes: ["email"],
                        invalidIfBlank: false
                    },
                    user_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    gender: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validValues: ["M", "F", "U", "MALE", "FEMALE", "UNKNOWN"]
                    },
                    available_ind: {
                        required: true,
                        validTypes: ["integer"],
                        invalidIfBlank: true,
                        validValues: ["1", "0"]
                    },
                    assign_student_role: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"]
                    },
                    allow_login: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"]
                    }
                },
                includeDataInLog: true,
                discardInvalidRows: true
            }
        }
    }
};

export const validateConfigWithLogHeaders = {
    parameters: {
        multipleFileConfig: true,
        fileValidateConfig: {
            users: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    family_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    middle_name: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    given_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    email: {
                        required: true,
                        validTypes: ["email"],
                        invalidIfBlank: false
                    },
                    secondary_email: {
                        required: false,
                        validTypes: ["email"],
                        invalidIfBlank: false
                    },
                    user_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    gender: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validValues: ["M", "F", "U", "MALE", "FEMALE", "UNKNOWN"]
                    },
                    available_ind: {
                        required: true,
                        validTypes: ["integer"],
                        invalidIfBlank: true,
                        validValues: ["1", "0"]
                    },
                    assign_student_role: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"]
                    },
                    allow_login: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"]
                    }
                },
                includeDataInLog: true,
                includeLogInData: false,
                logHeaders: ["integration_id"],
                discardInvalidRows: true
            },
            relationships: {
                columns: {
                    parent_integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    parent_role: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    child_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    child_role: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true,
                        validValues: ["STUDENT", "BASIC USER", "INSTRUCTOR", "TA"]
                    },
                    term_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    }
                },
                includeDataInLog: true,
                includeLogInData: false,
                logHeaders: ["logData"],
                discardInvalidRows: true
            },
            sections: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    course_section_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    course_section_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    start_dt: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYY-MM-DD"],
                        compareField: "current_date",
                        comparator: "lt"
                    },
                    end_dt: {
                        required: false,
                        validTypes: ["datetime"],
                        invalidIfBlank: false,
                        dateTimeFormat: ["YYYY-MM-DD"],
                        compareField: "start_dt",
                        comparator: "gt"
                    },
                    term_id: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    course_integration_id: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    course_section_delivery: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validvalues: ["01", "02", "03", "99"]
                    }
                },
                logHeaders: ["Row", "Validation_Info", "Validation_Status"]
            }
        },
        writeErrorDataToJobMeta: true
    }
};

export const validateConfigUsingSchema = {
    parameters: {
        dummy_schema: {
            "studentId": {
                "name": "Student ID",
                "type": "string",
                "position": 0
            },
            "testDate": {
                "name": "Test Date",
                "type": "date",
                "position": 10,
                "optional": true
            },
            "legacyScoreId": {
                "name": "Legacy Score ID",
                "type": "string",
                "position": 12,
                "optional": true
            },
            "gradeLevel": {
                "name": "Grade Level",
                "type": "number",
                "min": 3,
                "max": 10,
                "position": 11
            },
            "english": {
                "name": "English",
                "type": "number",
                "position": 1,
                "min": 400,
                "max": {
                    "3": 435,
                    "4": 438,
                    "5": 442,
                    "6": 448,
                    "7": 450,
                    "8": 452,
                    "9": 456,
                    "10": 456
                },
                "optional": true,
                "dependsOn": "Grade Level"
            },
            "reading": {
                "name": "Reading",
                "type": "number",
                "position": 3,
                "min": 400,
                "max": {
                    "3": 429,
                    "4": 431,
                    "5": 434,
                    "6": 436,
                    "7": 438,
                    "8": 440,
                    "9": 442,
                    "10": 442
                },
                "optional": true,
                "dependsOn": "Grade Level"
            },
            "science": {
                "name": "Science",
                "type": "number",
                "position": 4,
                "min": 400,
                "max": {
                    "3": 433,
                    "4": 436,
                    "5": 438,
                    "6": 440,
                    "7": 443,
                    "8": 446,
                    "9": 449,
                    "10": 449
                },
                "optional": true,
                "dependsOn": "Grade Level"
            },
            "math": {
                "name": "Mathematics",
                "type": "number",
                "position": 2,
                "min": 400,
                "max": {
                    "3": 434,
                    "4": 440,
                    "5": 446,
                    "6": 451,
                    "7": 453,
                    "8": 456,
                    "9": 460,
                    "10": 460
                },
                "optional": true,
                "dependsOn": "Grade Level"
            },
            "writing": {
                "name": "Writing",
                "type": "number",
                "position": 5,
                "min": 0,
                "max": 448,
                "optional": true
            },
            "total": {
                "name": "Composite (total)",
                "type": "number",
                "position": 8,
                "min": 400,
                "max": {
                    "3": 433,
                    "4": 436,
                    "5": 440,
                    "6": 444,
                    "7": 446,
                    "8": 449,
                    "9": 452,
                    "10": 452
                },
                "optional": true,
                "dependsOn": "Grade Level"
            },
            "ela": {
                "name": "English Language Arts",
                "type": "number",
                "position": 6,
                "min": 0,
                "max": {
                    "3": 438,
                    "4": 439,
                    "5": 442,
                    "6": 444,
                    "7": 446,
                    "8": 447,
                    "9": 449,
                    "10": 449
                },
                "optional": true,
                "dependsOn": "Grade Level"
            },
            "stem": {
                "name": "Science, Technology, Engineering and Math",
                "type": "number",
                "position": 7,
                "min": 0,
                "max": {
                    "3": 434,
                    "4": 438,
                    "5": 442,
                    "6": 446,
                    "7": 448,
                    "8": 451,
                    "9": 455,
                    "10": 455
                },
                "optional": true,
                "dependsOn": "Grade Level"
            },
            "predictedAct": {
                "name": "Predicted ACT Score",
                "type": "string",
                "position": 9,
                "optional": true
            }
        },
        validateConfig: {
            columns: {}
        },
        jsonSchemaNames: ["dummy_schema"]
    }
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
        secondary_email: "secondary_email"
    },
    fileInfo: userFileInfo
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
        secondary_email: "secondary_email"
    }
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
        secondary_email: "testusernew@gmail.com"
    },
    json: ["goldnew", "yolandanew", "testusernew@gmail.com", "ygold_test", "1", "testusernew@gmail.com"],
    name: "users",
    fileInfo: userFileInfo
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
        secondary_email: "testusernewgmail.com"
    },
    json: ["Yolanda.Gold", "goldnew", "yolandanew", "testusernewgmail.com", "ygold_test", "1", "testusernewgmail.com"],
    name: "users",
    fileInfo: userFileInfo
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
        secondary_email: "testusernew@gmail.com"
    },
    json: ["Yolanda.Gold", "goldnew", "yolandanew", "testusernew@gmail.com", "ygold_test", "1", "testusernew@gmail.com"],
    name: "users",
    fileInfo: userFileInfo
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
        "testusernew@gmail.com"
    ],
    data: {
        integration_id: "Yolanda.Gold",
        family_name: "goldnew",
        given_name: "yolandanew",
        email: "testusernew@gmail.com",
        user_id: "ygold_test",
        available_ind: "12345",
        secondary_email: "testusernew@gmail.com"
    },
    json: [
        "Yolanda.Gold",
        "goldnew",
        "yolandanew",
        "testusernew@gmail.com",
        "ygold_test",
        "12345",
        "testusernew@gmail.com"
    ],
    name: "users",
    fileInfo: userFileInfo
};

export const usersDataRowWithMissingValues = {
    index: 2,
    raw: [
        "",
        "goldnew",
        "yolandanew",
        "",
        "ygold_test",
        "12345",
        "testusernewgmail.com"
    ],
    data: {
        integration_id: "",
        family_name: "goldnew",
        given_name: "yolandanew",
        email: "",
        user_id: "ygold_test",
        available_ind: "12345",
        secondary_email: "testusernewgmail.com"
    },
    json: [
        "",
        "goldnew",
        "yolandanew",
        "",
        "ygold_test",
        "12345",
        "testusernewgmail.com"
    ],
    name: "users",
    fileInfo: userFileInfo
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
        "course_section_delivery"
    ],
    data: {
        integration_id: "integration_id",
        course_section_name: "course_section_name",
        course_section_id: "course_section_id",
        start_dt: "start_dt",
        end_dt: "end_dt",
        term_id: "term_id",
        course_integration_id: "course_integration_id",
        course_section_delivery: "course_section_delivery"
    }
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
        "03"
    ],
    data: {
        integration_id: "UNIV-SRF101-602-202002",
        course_section_name: "Canvas Course",
        course_section_id: "UNIV-SRF101-602-202002",
        start_dt: "2020-08-10",
        end_dt: "2021-01-10",
        term_id: "202002",
        course_integration_id: "SRF101",
        course_section_delivery: "03"
    },
    json: [
        "UNIV-SRF101-602-202002",
        "Canvas Course",
        "UNIV-SRF101-602-202002",
        "2020-08-10",
        "2021-01-10",
        "202002",
        "SRF101",
        "03"
    ],
    name: "sections",
    fileInfo: sectionsFileInfo
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
        "is_on_probation",
        "batch_year",
        "invalid_date_column",
        "invalid_type_column"
    ],
    data: {
        course_section_integration_id: "course_section_integration_id",
        user_integration_id: "user_integration_id",
        user_role: "user_role",
        available_ind: "available_ind",
        credit_hours: "credit_hours",
        last_access_date: "last_access_date",
        authoritative_status: "authoritative_status",
        is_on_probation: "is_on_probation",
        batch_year: "batch_year",
        invalid_date_column: "invalid_date_column",
        invalid_type_column: "invalid_type_column"
    }
};

export const enrollmentDataRowWithDifferentDateFormatValue = {
    index: 2,
    raw: ["UNIV-SRF101-602-202002", "Yolanda.Gold", "INSTRUCTOR", "1", "1.5", "2016-09-20 14:04:05", "0.1", "FALSE"],
    data: {
        course_section_integration_id: "UNIV-SRF101-602-20200",
        user_integration_id: "Yolanda.Gold",
        user_role: "INSTRUCTOR",
        available_ind: "1",
        credit_hours: "1.5",
        last_access_date: "2016-09-20 14:04:05",
        authoritative_status: "0.1",
        is_on_probation: "FALSE"
    },
    json: ["UNIV-SRF101-602-202002", "Yolanda.Gold", "INSTRUCTOR", "1", "1.5", "2016-09-20 14:04:05", "0.1", "FALSE"],
    name: "enrollment",
    fileInfo: enrollmentFileInfo
};

export const enrollmentDataRowWithInvalidTypesValue = {
    index: 2,
    raw: [
        "UNIV-SRF101-602-202002",
        "Yolanda.Gold",
        "INSTRUCTOR",
        "1",
        "1.5",
        "2016-09-20 14:04:05",
        "0.1",
        "TRUE",
        "2021",
        "",
        ""
    ],
    data: {
        course_section_integration_id: "UNIV-SRF101-602-20200",
        user_integration_id: "Yolanda.Gold",
        user_role: "INSTRUCTOR",
        available_ind: "1",
        credit_hours: "1.5",
        last_access_date: "2016-09-20 14:04:05",
        authoritative_status: "0.1",
        is_on_probation: "TRUE",
        batch_year: "2021",
        invalid_date_column: "",
        invalid_type_column: ""
    },
    json: [
        "UNIV-SRF101-602-202002",
        "Yolanda.Gold",
        "INSTRUCTOR",
        "1",
        "1.5",
        "2016-09-20 14:04:05",
        "0.1",
        "TRUE",
        "2021",
        "2021",
        "",
        ""
    ],
    name: "enrollment",
    fileInfo: enrollmentFileInfo
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
        "03"
    ],
    data: {
        integration_id: "UNIV-SRF101-602-202002",
        course_section_name: "Canvas Course",
        course_section_id: "UNIV-SRF101-602-202002",
        start_dt: "10-12-2020",
        end_dt: "2021-01-10",
        term_id: "202002",
        course_integration_id: "SRF101",
        course_section_delivery: "03"
    },
    json: [
        "UNIV-SRF101-602-202002",
        "Canvas Course",
        "UNIV-SRF101-602-202002",
        "10-12-2020",
        "2021-01-10",
        "202002",
        "SRF101",
        "03"
    ],
    name: "sections",
    fileInfo: sectionsFileInfo
};

export const validateConfigWithWarning = {
    parameters: {
        multipleFileConfig: true,
        fileValidateConfig: {
            users: {
                columns: {
                    integration_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    family_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    middle_name: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    given_name: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: false
                    },
                    email: {
                        required: true,
                        validTypes: ["email"],
                        invalidIfBlank: false
                    },
                    secondary_email: {
                        required: false,
                        validTypes: ["email"],
                        invalidIfBlank: false
                    },
                    user_id: {
                        required: true,
                        validTypes: ["string"],
                        invalidIfBlank: true
                    },
                    gender: {
                        required: false,
                        validTypes: ["string"],
                        invalidIfBlank: false,
                        validValues: ["M", "F", "U", "MALE", "FEMALE", "UNKNOWN"]
                    },
                    available_ind: {
                        required: true,
                        validTypes: ["integer"],
                        invalidIfBlank: true,
                        validWithWarningValues: ["12345"],
                        validValues: ["1", "0"]
                    },
                    assign_student_role: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"]
                    },
                    allow_login: {
                        required: false,
                        validTypes: ["integer"],
                        invalidIfBlank: false,
                        validValues: ["1", "0"]
                    }
                },
                includeDataInLog: true,
                includeLogInData: true,
                discardInvalidRows: false
            }
        }
    }
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
        "gender"
    ],
    data: {
        integration_id: "integration_id",
        family_name: "family_name",
        given_name: "given_name",
        email: "email",
        user_id: "user_id",
        available_ind: "available_ind",
        secondary_email: "secondary_email",
        gender: "gender"
    }
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
        "FeMale"
    ],
    data: {
        integration_id: "ygold",
        family_name: "goldnew",
        given_name: "yolandanew",
        email: "testusernew@gmail.com",
        user_id: "ygold_test",
        available_ind: "1",
        secondary_email: "testusernew@gmail.com",
        gender: "FeMale"
    },
    json: [
        "ygold",
        "goldnew",
        "yolandanew",
        "testusernew@gmail.com",
        "ygold_test",
        "1",
        "testusernew@gmail.com",
        "FeMale"
    ],
    name: "users",
    fileInfo: userFileInfo
};

export const channelConfig = {
    guid: "some-channel-guid",
    product: "some-product",
    name: "some-channel",
    configType: ConfigType.CHANNEL,
    isDeleted: false,
    noTaskLogs: false,
    detailsGuid: "some-channel-details-guid",
    isLatest: true,
    created:  new Date(),
    replaced: new Date(),
    author: "",
    flow: ["validate"],
    steps: {
        validate: {
            inputs: ["users"],
            method: "validate",
            outputs: ["usersValidated"],
            processor: "some-processor-name",
            parameters: validateConfig.parameters,
            granularity: "row"
        }
    },
    systemFailureRetries: 1,
    inheritOnly: false
};

const jobConfig = {
    guid: "some-guid-here",
    created: new Date(),
    name: "some-job",
    isDeleted: false,
    currentStep: "validate",
    flow: ["validate"],
    flowIdx: 0,
    status: JobStatus.Started,
    statusMsg: "",
    channel: {
        guid: "some-channel-guid-here",
        name: "some-channel"
    },
    filesIn: [
        {
            s3: { key: "ready/manualimports/piiMask/users.csv", bucket: "sfdev" },
            name: "users"
        }
    ],
    filesOut: [{ s3: { key: "users", bucket: "" }, name: "users_1" }],
    steps: {
        validate: {
            finished: false
        }
    }
};

export const previodStepJobConfig = {
    guid: "some-guid-here",
    name: "previous-step-job",
    currentStep: "validate",
    flow: ["prevStep", "validate"],
    flowIdx: 1,
    status: JobStatus.Started,
    statusMsg: "",
    created: new Date(),
    isDeleted: false,
    channel: {
        guid: "some-channel-guid-here",
        name: "some-channel"
    },
    filesIn: [
        {
            s3: { key: "ready/manualimports/piiMask/users.csv", bucket: "sfdev" },
            name: "users"
        }
    ],
    filesOut: [{ s3: { key: "users", bucket: "" }, name: "users_1" }],
    steps: {
        validate: {
            finished: false
        }
    }
};

export const currentStepEmptyJobConfig = {
    guid: "some-guid-here",
    name: "empty-step-job",
    currentStep: null,
    flow: ["validate"],
    flowIdx: 0,
    status: JobStatus.Started,
    statusMsg: "",
    created: new Date(),
    isDeleted: false,
    channel: {
        guid: "some-channel-guid-here",
        name: "some-channel"
    },
    filesIn: [
        {
            s3: { key: "ready/manualimports/piiMask/users.csv", bucket: "sfdev" },
            name: "users"
        }
    ],
    filesOut: [{ s3: { key: "users", bucket: "" }, name: "users_1" }],
    steps: {
        validate: {
            finished: false
        }
    }
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
        "course_period_start_time",
        "course_period_end_time",
        "mob",
        "par_student_start_date",
        "par_student_end_date",
        "birth_date",
        "email"
    ],
    data: {
        institution_id: "institution_id",
        integration_id: "integration_id",
        student_course_start_date: "student_course_start_date",
        student_course_end_date: "student_course_end_date",
        course_period_start_time: "course_period_start_time",
        course_period_end_time: "course_period_end_time",
        mob: "mob",
        par_student_start_date: "par_student_start_date",
        par_student_end_date: "par_student_end_date",
        birth_date: "birth_date",
        email: "email"
    }
};

export const studentCourseDataRowWithDatetimeValue = {
    index: 2,
    raw: [
        "100001",
        "UNIV-SRF101-602-202002",
        "20200810",
        "20200910",
        "03:00pm",
        "03:45pm",
        "10:30AM",
        "202011",
        "20201201",
        "2020-01-23 10:30:00",
        ""
    ],
    data: {
        institution_id: "100001",
        integration_id: "UNIV-SRF101-602-202002",
        student_course_start_date: "20200810",
        student_course_end_date: "20200910",
        course_period_start_time: "03:00pm",
        course_period_end_time: "03:45pm",
        mob: "10:30AM",
        par_student_start_date: "202011",
        par_student_end_date: "20201201",
        birth_date: "2020-01-23 10:30:00",
        email: ""
    },
    json: [
        "100001",
        "UNIV-SRF101-602-202002",
        "20200810",
        "20200910",
        "03:00pm",
        "03:45pm",
        "10:30AM",
        "202011",
        "20201201",
        "2020-01-23 10:30:00",
        ""
    ],
    name: "studentCourse",
    fileInfo: studentCourseFileInfo
};
export const studentCourseDataRowWithInvalidDatetimeValue = {
    index: 2,
    raw: [
        "100001",
        "UNIV-SRF101-602-202002",
        "202810",
        "2020080",
        "03:00pm",
        "02:45pm",
        "10.30AM",
        "20211",
        "2020121",
        "2020-01-2310:30:00",
        "testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest@test.com"
    ],
    data: {
        institution_id: "100001",
        integration_id: "UNIV-SRF101-602-202002",
        student_course_start_date: "202810",
        student_course_end_date: "2020080",
        course_period_start_time: "03:00pm",
        course_period_end_time: "02:45pm",
        mob: "10.30AM",
        par_student_start_date: "20211",
        par_student_end_date: "2020121",
        birth_date: "2020-01-2310:30:00",
        email: "testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest@test.com"
    },
    json: [
        "100001",
        "UNIV-SRF101-602-202002",
        "202810",
        "2020080",
        "03:00pm",
        "02:45pm",
        "10.30AM",
        "20211",
        "2020121",
        "2020-01-2310:30:00",
        "testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest@test.com"
    ],
    name: "studentCourse",
    fileInfo: studentCourseFileInfo
};
export const studentCourseDataRowWithInvalidDatetime = {
    index: 2,
    raw: [
        "100001",
        "UNIV-SRF101-602-202002",
        "20200810",
        "20200810",
        "03:00pm",
        "10:30AM",
        "202011",
        "20201201",
        "2010-02-28 10:70:00"
    ],
    data: {
        institution_id: "100001",
        integration_id: "UNIV-SRF101-602-202002",
        student_course_start_date: "20200810",
        student_course_end_date: "20200810",
        course_period_start_time: "03:00pm",
        mob: "10:30AM",
        par_student_start_date: "202011",
        par_student_end_date: "20201201",
        birth_date: "2010-02-28 10:70:00"
    },
    json: [
        "100001",
        "UNIV-SRF101-602-202002",
        "20200810",
        "20200810",
        "03:00pm",
        "10:30AM",
        "202011",
        "20201201",
        "2010-02-28 10:70:00"
    ],
    name: "studentCourse",
    fileInfo: studentCourseFileInfo
};
export function getValidateProcessor(customConfig?: IJobConfig): Validate {
    const config = customConfig ?? jobConfig;
    const validateProcessor = new Validate(jobWithInlineChannel(config, channelConfig));
    validateProcessor.createOutput = jest.fn().mockReturnValue(``);
    validateProcessor.createInput = jest.fn().mockReturnValue(``);

    return validateProcessor;
}

export const testScoreHeaderInputRow = {
    index: 1,
    name: "test_score",
    fileInfo: testScoreFileInfo,
    raw: [
        "Student ID",
        "First Name",
        "Middle Name",
        "Last Name",
        "Class Year",
        "English",
        "Mathematics",
        "Reading",
        "Science",
        "Writing",
        "Composite (total)",
        "Test Date",
        "Grade Level"
    ],
    data: {
        "Student ID": "Student ID",
        "First Name": "First Name",
        "Middle Name": "Middle Name",
        "Last Name": "Last Name",
        "Class Year": "Class Year",
        "English": "English",
        "Mathematics": "Mathematics",
        "Reading": "Reading",
        "Science": "Science",
        "Writing": "Writing",
        "Composite (total)": "Composite (total)",
        "Test Date": "Test Date",
        "Grade Level": "Grade Level"
    },
    ...validateConfigUsingSchema
};

export const testScoreInvalidDataInputRow = {
    index: 2,
    raw: [
        "12279384",
        "Doe",
        "P",
        "Keating",
        "2011",
        "435",
        "435",
        "421",
        "440",
        "440",
        "433",
        "2009-06-01",
        "3"
    ],
    data: {
        "Student ID": "12279384",
        "First Name": "Doe",
        "Middle Name": "P",
        "Last Name": "Keating",
        "Class Year": "2011",
        "English": "435",
        "Mathematics": "435",
        "Reading": "421",
        "Science": "440",
        "Writing": "440",
        "Composite": "433",
        "Test Date": "2009-06-01",
        "Grade Level": "3"
    },
    json: [
        "12279384",
        "Doe",
        "P",
        "Keating",
        "2011",
        "435",
        "435",
        "421",
        "440",
        "440",
        "433",
        "2009-06-01",
        "3"
    ],
    name: "testScore",
    fileInfo: testScoreFileInfo,
    ...validateConfigUsingSchema
};

export const testScoreValidDataInputRow = {
    index: 2,
    raw: [
        "12279384",
        "Doe",
        "P",
        "Keating",
        "2011",
        "450",
        "451",
        "436",
        "440",
        "440",
        "445",
        "2009-06-01",
        "7"
    ],
    data: {
        "Student ID": "12279384",
        "First Name": "Doe",
        "Middle Name": "P",
        "Last Name": "Keating",
        "Class Year": "2011",
        "English": "450",
        "Mathematics": "451",
        "Reading": "436",
        "Science": "440",
        "Writing": "440",
        "Composite": "445",
        "Test Date": "2009-06-01",
        "Grade Level": "7"
    },
    json: [
        "12279384",
        "Doe",
        "P",
        "Keating",
        "2011",
        "450",
        "451",
        "436",
        "440",
        "440",
        "445",
        "2009-06-01",
        "6"
    ],
    name: "testScore",
    fileInfo: testScoreFileInfo,
    ...validateConfigUsingSchema
};

export const testScoreInvalidDataInputRow2 = {
    index: 2,
    raw: [
        "12279384",
        "Doe",
        "P",
        "Keating",
        "2011",
        "500",
        "300",
        "421",
        "440",
        "600",
        "433",
        "2009-06-01",
        "10"
    ],
    data: {
        "Student ID": "12279384",
        "First Name": "Doe",
        "Middle Name": "P",
        "Last Name": "Keating",
        "Class Year": "2011",
        "English": "500",
        "Mathematics": "300",
        "Reading": "421",
        "Science": "440",
        "Writing": "600",
        "Composite": "433",
        "Test Date": "2009-06-01",
        "Grade Level": "10"
    },
    json: [
        "12279384",
        "Doe",
        "P",
        "Keating",
        "2011",
        "500",
        "300",
        "421",
        "440",
        "600",
        "433",
        "2009-06-01",
        "10"
    ],
    name: "testScore",
    fileInfo: testScoreFileInfo,
    ...validateConfigUsingSchema
};
