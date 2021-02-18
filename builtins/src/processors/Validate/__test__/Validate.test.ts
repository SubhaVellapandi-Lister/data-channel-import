import "jest";
import {
    validateConfig,
    validateConfigWithWarning,
    validateConfigLogExcluded,
    validateConfigUsingSchema,
    usersHeaderInputRow,
    usersDataRowWithInvalidEmail,
    usersDataRowWithValidEmail,
    usersDataRowWithInvalidValue,
    usersDataInputRowWithMissingValue,
    usersHeaderInputRowWithMissingColumn,
    validateConfigWithLogHeaders,
    sectionsDataRowWithDatetimeValue,
    sectionsHeaderInputRowWithDate,
    sectionsDataRowWithInvalidDateFormat,
    enrollmentHeaderInputRowWithDifferentDateFormat,
    enrollmentDataRowWithDifferentDateFormatValue,
    usersHeaderInputRowForCaseInSensitiveValidation,
    userDataRowWithCaseInSensitiveValue,
    getValidateProcessor,
    studentCourseHeaderInputRowWithDate,
    studentCourseDataRowWithDatetimeValue,
    studentCourseDataRowWithInvalidDatetimeValue,
    studentCourseDataRowWithInvalidDatetime,
    testScoreHeaderInputRow,
    testScoreInvalidDataInputRow,
    testScoreValidDataInputRow,
    testScoreInvalidDataInputRow2
} from "./ValidateTestInput";

describe("ValidateProcessor", () => {
    test("Validate the email column for their values and return validation status with message in the output file", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfig);
        await validateProcessor["validate"](usersHeaderInputRow);
        const result = await validateProcessor["validate"](usersDataRowWithInvalidEmail);

        expect(result).toEqual({
            error: true,
            outputs: {
                usersValidated: [
                    "Yolanda.Gold",
                    "goldnew",
                    "yolandanew",
                    "testusernewgmail.com",
                    "ygold_test",
                    "1",
                    "testusernewgmail.com",
                    "invalid",
                    "Column email must be of type email; Column secondary_email must be of type email"
                ]
            }
        });
    });

    test("Validate the email column and return validation status with message in the log file based on the log config", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfigLogExcluded);
        await validateProcessor["validate"](usersHeaderInputRow);
        const result = await validateProcessor["validate"](usersDataRowWithInvalidEmail);

        expect(result).toEqual({
            error: true,
            outputs: {
                log: [
                    "2",
                    "Yolanda.Gold",
                    "goldnew",
                    "yolandanew",
                    "testusernewgmail.com",
                    "ygold_test",
                    "1",
                    "testusernewgmail.com",
                    "invalid",
                    "Column email must be of type email; Column secondary_email must be of type email"
                ]
            }
        });
    });

    test("Validate the file and print the status in log and output in the file", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfigLogExcluded);
        await validateProcessor["validate"](usersHeaderInputRow);

        const result = await validateProcessor["validate"](usersDataRowWithValidEmail);

        expect(result).toEqual({
            error: false,
            outputs: {
                log: [
                    "2",
                    "Yolanda.Gold",
                    "goldnew",
                    "yolandanew",
                    "testusernew@gmail.com",
                    "ygold_test",
                    "1",
                    "testusernew@gmail.com",
                    "valid",
                    ""
                ],
                usersValidated: [
                    "Yolanda.Gold",
                    "goldnew",
                    "yolandanew",
                    "testusernew@gmail.com",
                    "ygold_test",
                    "1",
                    "testusernew@gmail.com"
                ]
            }
        });
    });

    test("Validate the valid values defined for a column called available_ind defined in the config", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfigLogExcluded);
        await validateProcessor["validate"](usersHeaderInputRow);

        const result = await validateProcessor["validate"](usersDataRowWithInvalidValue);

        expect(result).toEqual({
            error: true,
            outputs: {
                log: [
                    "2",
                    "Yolanda.Gold",
                    "goldnew",
                    "yolandanew",
                    "testusernew@gmail.com",
                    "ygold_test",
                    "12345",
                    "testusernew@gmail.com",
                    "invalid",
                    "Invalid Value for available_ind"
                ]
            }
        });
    });

    test("Validate a date time value defined in the sections file", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfig);
        await validateProcessor["validate"](sectionsHeaderInputRowWithDate);

        const result = await validateProcessor["validate"](sectionsDataRowWithDatetimeValue);

        expect(result).toEqual({
            error: false,
            outputs: {
                sectionsValidated: [
                    "UNIV-SRF101-602-202002",
                    "Canvas Course",
                    "UNIV-SRF101-602-202002",
                    "2020-08-10",
                    "2021-01-10",
                    "202002",
                    "SRF101",
                    "03",
                    "valid",
                    ""
                ]
            }
        });
    });

    test("Validate a different date time format yyyy-mm-dd hh:mm:ss defined in the sections file", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfig);
        await validateProcessor["validate"](enrollmentHeaderInputRowWithDifferentDateFormat);

        const result = await validateProcessor["validate"](enrollmentDataRowWithDifferentDateFormatValue);

        expect(result).toEqual({
            error: false,
            outputs: {
                enrollmentValidated: [
                    "UNIV-SRF101-602-202002",
                    "Yolanda.Gold",
                    "INSTRUCTOR",
                    "1",
                    "1.5",
                    "2016-09-20 14:04:05",
                    "01",
                    "valid",
                    ""
                ]
            }
        });
    });

    test("Validate to check a different format date time value and check if error is thrown", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfig);
        await validateProcessor["validate"](sectionsHeaderInputRowWithDate);

        const result = await validateProcessor["validate"](sectionsDataRowWithInvalidDateFormat);

        expect(result).toEqual({
            error: true,
            outputs: {
                sectionsValidated: [
                    "UNIV-SRF101-602-202002",
                    "Canvas Course",
                    "UNIV-SRF101-602-202002",
                    "10-12-2020",
                    "2021-01-10",
                    "202002",
                    "SRF101",
                    "03",
                    "invalid",
                    "Column start_dt must be lesser than the Column current_date and must be of type datetime"
                ]
            }
        });
    });

    test("Including the log headers config to write custom column values in to the log file", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfigWithLogHeaders);
        await validateProcessor["validate"](usersHeaderInputRow);

        const result = await validateProcessor["validate"](usersDataRowWithValidEmail);

        expect(result).toEqual({
            error: false,
            outputs: {
                log: ["2", "Yolanda.Gold", "valid", ""],
                usersValidated: [
                    "Yolanda.Gold",
                    "goldnew",
                    "yolandanew",
                    "testusernew@gmail.com",
                    "ygold_test",
                    "1",
                    "testusernew@gmail.com"
                ]
            }
        });
    });

    test("To test whether error is thrown when validate config is not specified.", async () => {
        const validateProcessor = getValidateProcessor();
        try {
            await validateProcessor["before_validate"]({
                parameters: {}
            });
        } catch (error) {
            expect(error.message).toEqual("Missing validateConfig in Validate-Builtin");
        }
    });

    test("Evaluate the required columns and throw appropriate error message", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfig);
        await validateProcessor["validate"](usersHeaderInputRowWithMissingColumn);
        const result = await validateProcessor["validate"](usersDataInputRowWithMissingValue);

        expect(result).toEqual({
            error: true,
            outputs: {
                usersValidated: [
                    "goldnew",
                    "yolandanew",
                    "testusernew@gmail.com",
                    "ygold_test",
                    "1",
                    "testusernew@gmail.com",
                    "invalid",
                    "Missing required column integration_id"
                ]
            }
        });
    });

    test("Use warning config flag to define the warning in the output file", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfigWithWarning);
        await validateProcessor["validate"](usersHeaderInputRow);

        const result = await validateProcessor["validate"](usersDataRowWithInvalidValue);

        expect(result).toEqual({
            error: false,
            outputs: {
                usersValidated: [
                    "Yolanda.Gold",
                    "goldnew",
                    "yolandanew",
                    "testusernew@gmail.com",
                    "ygold_test",
                    "12345",
                    "testusernew@gmail.com",
                    "warning",
                    "Invalid Value for available_ind"
                ]
            }
        });
    });

    test("Validate the case insenstive validation approach in the users file", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfig);
        await validateProcessor["validate"](usersHeaderInputRowForCaseInSensitiveValidation);

        const result = await validateProcessor["validate"](userDataRowWithCaseInSensitiveValue);

        expect(result).toEqual({
            error: false,
            outputs: {
                usersValidated: [
                    "ygold",
                    "goldnew",
                    "yolandanew",
                    "testusernew@gmail.com",
                    "ygold_test",
                    "1",
                    "testusernew@gmail.com",
                    "FeMale",
                    "valid",
                    ""
                ]
            }
        });
    });

    test("Validate a date with YYYYMMDD,YYYYMM,HH:MM AM value defined in the student course file", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfig);
        await validateProcessor["validate"](studentCourseHeaderInputRowWithDate);

        const result = await validateProcessor["validate"](studentCourseDataRowWithDatetimeValue);

        expect(result).toEqual({
            error: false,
            outputs: {
                studentCourseValidated: [
                    "100001",
                    "UNIV-SRF101-602-202002",
                    "20200810",
                    "20200810",
                    "10:30AM",
                    "202011",
                    "20201201",
                    "2020-01-23 10:30:00",
                    "",
                    "valid",
                    ""
                ]
            }
        });
    });
    test("Validate a error date with YYYYMMDD,YYYYMM,HH:MM AM value defined in the student course file", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfig);
        await validateProcessor["validate"](studentCourseHeaderInputRowWithDate);

        const result = await validateProcessor["validate"](studentCourseDataRowWithInvalidDatetimeValue);

        expect(result).toEqual({
            error: true,
            outputs: {
                studentCourseValidated: [
                    "100001",
                    "UNIV-SRF101-602-202002",
                    "202810",
                    "2020080",
                    "10.30AM",
                    "20211",
                    "2020121",
                    "2020-01-2310:30:00",
                    "testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest@test.com",
                    "invalid",
                    "Column student_course_start_date must be lesser than or equal to the Column student_course_end_date and must be of type datetime; Column student_course_end_date must be greater than or equal to the Column student_course_start_date and must be of type datetime; Column mob must be of type datetime; Column par_student_start_date must be of type datetime; Column par_student_end_date must be equal to the Column par_student_end_date and must be of type datetime; Column birth_date must be of type datetime; Column email must be of type email"
                ]
            }
        });
    });

    test("Validate a error date with YYYYMM,HH:MM:SS", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor["before_validate"](validateConfig);
        await validateProcessor["validate"](studentCourseHeaderInputRowWithDate);

        const result = await validateProcessor["validate"](studentCourseDataRowWithInvalidDatetime);

        expect(result).toEqual({
            error: true,
            outputs: {
                studentCourseValidated: [
                    "100001",
                    "UNIV-SRF101-602-202002",
                    "20200810",
                    "20200810",
                    "10:30AM",
                    "202011",
                    "20201201",
                    "2010-02-28 10:70:00",
                    "invalid",
                    "Column birth_date must be of type datetime"
                ]
            }
        });
    });

    test("Use Validate method to validate headers", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor.before_validate(validateConfigUsingSchema);
        const headers = await validateProcessor.validate(testScoreHeaderInputRow);

        expect(headers).toEqual({
            outputs: {
                test_scoreValidated: [
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
                log: [
                    "Row",
                    "Student ID",
                    "Validation_Status",
                    "Validation_Info"
                ]
            }
        });
    });

    test("Use Validate method to show error on invalid test scores - case Testing for minMax object", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor.before_validate(validateConfigUsingSchema);
        await validateProcessor.validate(testScoreHeaderInputRow);

        const result = await validateProcessor.validate(testScoreInvalidDataInputRow);

        expect(result).toEqual({
            error: true,
            outputs: {
                log: [
                    "2",
                    "12279384",
                    "invalid",
                    "Value 440 for Science is above the maximum of 433; Value 435 for Mathematics is above the maximum of 434"
                ]
            }
        });
    });

    test("Use Validate method to show error on invalid test scores - case Testing for minMax by number", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor.before_validate(validateConfigUsingSchema);
        await validateProcessor.validate(testScoreHeaderInputRow);

        const result = await validateProcessor.validate(testScoreInvalidDataInputRow2);

        expect(result).toEqual({
            error: true,
            outputs: {
                log: [
                    "2",
                    "12279384",
                    "invalid",
                    "Value 500 for English is above the maximum of 456; Value 300 for Mathematics is below the minimum of 400; Value 600 for Writing is above the maximum of 448"
                ]
            }
        });
    });

    test("Use Validate method to validate test scores", async () => {
        const validateProcessor = getValidateProcessor();
        await validateProcessor.before_validate(validateConfigUsingSchema);
        await validateProcessor.validate(testScoreHeaderInputRow);

        const result = await validateProcessor.validate(testScoreValidDataInputRow);

        expect(result).toEqual({
            error: false,
            outputs: {
                testScoreValidated: [
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
                log: [
                    "2",
                    "12279384",
                    "valid",
                    ""
                ]
            }
        });
    });
});
