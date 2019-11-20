import {
    AnnotationOperator,
    Annotations,
    Batch,
    Course,
    CourseStatement,
    IAnnotationItems,
    Namespace
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IRowData,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { instructionalLevelMap } from "./Contants";
import { getCombinedSubjectArea, getMigratedSubjectArea, ISubjectAreaLoad, loadExistingSubjectAreas,
    parseSubjectAreaRow, saveSubjectAreas } from "./SubjectAreas";
import { getRowVal, prereqCourseStatement, prereqCourseStatementFromJson } from "./Utils";

export class CourseImport {
    public static courseFromRowData(
        rowData: IRowData, singleHighschoolId: string,
        subjectAreasLoaded: ISubjectAreaLoad, schoolsByCourse: { [key: string]: string[] }
    ): Course {
        const courseId = getRowVal(rowData, 'Course_ID') || getRowVal(rowData, 'Course_Code') || '';
        const courseName = getRowVal(rowData, 'Course_Name') || getRowVal(rowData, 'Course_Title') || '';
        const stateId = getRowVal(rowData, 'State_ID') || getRowVal(rowData, 'State_Category_Code') || '';
        const credits = parseFloat(getRowVal(rowData, 'Credits') || getRowVal(rowData, 'Credit') || '0') || 0;
        const instructionalLevelCode = getRowVal(rowData, 'Instructional_Level') || 'UT';
        const instructionalLevel = instructionalLevelMap[instructionalLevelCode] || 'Untracked';
        const rawStatusCode = (getRowVal(rowData, 'Status') || getRowVal(rowData, 'Active'));
        const statusCode = (rawStatusCode === 'Y' || rawStatusCode === '1' || rawStatusCode === 'A') ?
             'ACTIVE' : 'INACTIVE';
        const isCte = getRowVal(rowData, 'CTE') === 'Y' ? 1 : 0;
        const isTechPrep = 0;
        const schoolsList = schoolsByCourse[courseId] || [];
        if (!schoolsList.length && singleHighschoolId) {
            schoolsList.push(singleHighschoolId);
        }
        const rowSub = getRowVal(rowData, 'Subject_Area') || getRowVal(rowData, 'SUBJECT_AREA_1') || '';
        const combinedSubjectArea = getCombinedSubjectArea(
            rowSub, getRowVal(rowData, 'SCED_Subject_Area') || '', subjectAreasLoaded, stateId
        );
        const grades: number[] = [];
        for (const g of [6, 7, 8, 9, 10, 11, 12]) {
            if (getRowVal(rowData, `GR${g}`) === 'Y') {
                grades.push(g);
            }
        }
        if (!grades.length) {
            const gradeLow = parseInt(getRowVal(rowData, 'Grade_Low') || getRowVal(rowData, 'GRADE_RANGE_LOW') || '');
            const gradeHigh = parseInt(
                (getRowVal(rowData, 'Grade_High') || getRowVal(rowData, 'GRADE_RANGE_HIGH') || '').replace('+', ''));
            if (gradeLow && gradeHigh && gradeHigh >= gradeLow) {
                let curGrade = gradeLow;
                while (curGrade <= gradeHigh) {
                    grades.push(curGrade);
                    curGrade += 1;
                }
            }
        }

        const description = (getRowVal(rowData, 'Description') || '')
            .replace('\\n', ' ').replace(/\n/g, ' ').replace(/\"/g, "'").replace(/\r/g, '').replace('\\r', ' ');

        const annoItems: IAnnotationItems = {
            id: { value: courseId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            number: { value: courseId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            name: { value: courseName, type: 'STRING', operator: AnnotationOperator.EQUALS },
            grades: { value: grades, type: 'LIST_INTEGER', operator: AnnotationOperator.EQUALS },
            status: { value: statusCode, type: 'STRING', operator: AnnotationOperator.EQUALS },
            credits: { value: credits, type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            cteCourse: { value: isCte, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            techPrepCourse: { value: isTechPrep, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            stateCode: { value: stateId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            stateId: { value: stateId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            subjectArea: { value: combinedSubjectArea, type: 'STRING', operator: AnnotationOperator.EQUALS },
            instructionalLevel: { value: instructionalLevel, type: 'STRING', operator: AnnotationOperator.EQUALS },
            schools: { value: schoolsList, type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            description: { value: description, type: 'STRING', operator: AnnotationOperator.EQUALS },
            prerequisites: {
                value: getRowVal(rowData, 'Prereq_Text') || '', type: 'STRING', operator: AnnotationOperator.EQUALS
            }
        };

        if (getRowVal(rowData, 'Elective')) {
            const isElective = getRowVal(rowData, 'Elective') === 'Y' ? 1 : 0;
            annoItems['elective'] = { value: isElective, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS };
        }

        if (getRowVal(rowData, 'Max_Enroll')) {
            const maxEnroll = parseInt(getRowVal(rowData, 'Max_Enroll') || '');
            annoItems['maxEnroll'] = { value: maxEnroll, type: 'DECIMAL', operator: AnnotationOperator.EQUALS };
        }

        if (getRowVal(rowData, 'Course_Duration')) {
            annoItems['courseDuration'] = {
                value: getRowVal(rowData, 'Course_Duration') || '', type: 'STRING', operator: AnnotationOperator.EQUALS
            };
        }

        const statements: CourseStatement[] = [];

        if (getRowVal(rowData, 'Prereq_ID')) {
            const cs = prereqCourseStatement(getRowVal(rowData, 'Prereq_ID') || '');
            if (cs) {
                statements.push(cs);
            }
        }

        if (getRowVal(rowData, 'Coreq_ID')) {
            const cs = prereqCourseStatement(getRowVal(rowData, 'Coreq_ID') || '');
            if (cs) {
                cs.annotations = Annotations.simple({coreq: true});
                statements.push(cs);
            }
        }

        const strippedCourseId = courseId.replace(/\s/g, '');

        const course = new Course(
            strippedCourseId,
            courseName,
            new Annotations(annoItems),
            statements
        );

        return course;
    }

    public static courseFromJSON(rowData: IRowData): Course | null {
        const cObj = JSON.parse(rowData['JSON_OBJECT']);

        const instructLev = cObj['instructionalLevel'] || 'Untracked';
        const isCte = cObj['cteCourse'] === true ? 1 : 0;
        const isTechPrep = cObj['techPrepCourse'] === true ? 1 : 0;
        const subName = cObj['subjectArea'] ? cObj['subjectArea']['name'] : 'Unknown';
        const subCategory = cObj['subjectArea'] ? cObj['subjectArea']['category'] : 'Basic Skills';
        const combinedSubjectArea = getMigratedSubjectArea(subName, subCategory);
        const desc = cObj['description'] || cObj['_description'];
        const courseId = cObj['id'] || cObj['schoolCode'];
        if (!courseId) {
            console.log('No course ID found', cObj);

            return null;
        }
        const schoolList = cObj['schools'] || [];
        if (!schoolList.length && cObj['highschoolId']) {
            schoolList.push(cObj['highschoolId']);
        }

        const annoItems: IAnnotationItems = {
            id: { value: courseId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            number: { value: courseId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            name: { value: cObj['name'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            grades: { value: cObj['grades'], type: 'LIST_INTEGER', operator: AnnotationOperator.EQUALS },
            status: { value: cObj['status'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            credits: { value: cObj['credits'], type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            cteCourse: { value: isCte, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            techPrepCourse: { value: isTechPrep, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            stateCode: { value: cObj['stateCode'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            stateId: { value: cObj['stateCode'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            subjectArea: { value: combinedSubjectArea, type: 'STRING', operator: AnnotationOperator.EQUALS },
            instructionalLevel: { value: instructLev, type: 'STRING', operator: AnnotationOperator.EQUALS },
            schools: { value: schoolList, type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            description: { value: desc, type: 'STRING', operator: AnnotationOperator.EQUALS }
        };

        const strippedCourseId = courseId.replace(/\s/g, '').split('(')[0];

        const statements: CourseStatement[] = [];

        if (cObj['coursePrerequisites']) {
            const cs = prereqCourseStatementFromJson(cObj['coursePrerequisites']);
            if (cs) {
                statements.push(cs);
            }
        }

        if (cObj['courseCorequisites']) {
            const cs = prereqCourseStatementFromJson(cObj['courseCorequisites']);
            if (cs) {
                cs.annotations = Annotations.simple({coreq: true});
                statements.push(cs);
            }
        }

        return new Course(
            strippedCourseId,
            cObj['name'],
            new Annotations(annoItems),
            statements
        );
    }
}
