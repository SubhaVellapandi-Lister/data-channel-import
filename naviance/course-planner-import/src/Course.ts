import {
    AnnotationOperator,
    Annotations,
    AnnotationValue,
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
import { getRowVal, prereqCourseStatement, prereqCourseStatementFromJson, sleep } from "./Utils";

export class CourseImport {
    public static finalCourseId(courseId: string) {
        return courseId.replace(/\s/g, '').replace(/\*/g, '').replace(/\?/g, '').split('(')[0];
    }

    public static fromExistingAnno(existing: Course | undefined, annoName: string): AnnotationValue | null {
        if (existing && existing.annotations.getValue(annoName)) {
            return existing.annotations.getValue(annoName);
        }

        return null;
    }

    public static courseFromRowData(
        rowData: IRowData,
        singleHighschoolId: string,
        subjectAreasLoaded: ISubjectAreaLoad,
        schoolsByCourse: { [key: string]: string[] },
        existingCourse: Course | undefined,
        defaultSchool?: string
    ): Course | null {
        const courseId = getRowVal(rowData, 'Course_ID') || getRowVal(rowData, 'Course_Code') || '';
        const strippedCourseId = this.finalCourseId(courseId);
        const courseName = getRowVal(rowData, 'Course_Name') || getRowVal(rowData, 'Course_Title') || '';
        const stateId = (getRowVal(rowData, 'State_ID')
            || getRowVal(rowData, 'State_Category_Code')
            || this.fromExistingAnno(existingCourse, 'stateId')
            || '') as string;
        const credits = parseFloat(getRowVal(rowData, 'Credits') || getRowVal(rowData, 'Credit') || '0') || 0;
        const instructionalLevelCode = getRowVal(rowData, 'Instructional_Level') || 'UT';
        const instructionalLevel = (
            instructionalLevelMap[instructionalLevelCode]
            || this.fromExistingAnno(existingCourse, 'instructionalLevel')
            || 'Untracked'
        ) as string;
        const fileStatusCode = getRowVal(rowData, 'Status') ?? getRowVal(rowData, 'Active');
        const rawStatusCode = fileStatusCode === undefined ? 'Y' : fileStatusCode;
        const statusCode = (rawStatusCode === 'Y' || rawStatusCode === '1' ||
            rawStatusCode === 'A' || rawStatusCode.toUpperCase() === 'ACTIVE') ?
             'ACTIVE' : 'INACTIVE';
        const cteRaw = getRowVal(rowData, 'CTE') || this.fromExistingAnno(existingCourse, 'cteCourse');
        const isCte = cteRaw === 'Y' || cteRaw === 1 ? 1 : 0;
        const isTechPrep = 0;
        let schoolsList = schoolsByCourse[courseId] || [];
        if (!schoolsList.length && singleHighschoolId) {
            schoolsList.push(singleHighschoolId);
        }
        if (!schoolsList.length && existingCourse) {
            const existSchools = existingCourse.annotations.getValue('schools');
            if (existSchools) {
                schoolsList = existSchools as string[];
            }
        }

        if (schoolsList.length === 0 && defaultSchool) {
            schoolsList = [defaultSchool];
        }

        const rowSub = getRowVal(rowData, 'Subject_Area') || getRowVal(rowData, 'SUBJECT_AREA_1') || '';
        const combinedSubjectArea = getCombinedSubjectArea(
            rowSub, getRowVal(rowData, 'SCED_Subject_Area') || '', subjectAreasLoaded, stateId
        );
        if (!combinedSubjectArea) {
            console.log(`Error, subject area ${rowSub} not found, skipping ${courseId}`);

            return null;
        }
        const grades: number[] = [];
        for (const g of [6, 7, 8, 9, 10, 11, 12]) {
            const grVal = getRowVal(rowData, `GR${g}`);
            if (grVal === 'Y' || grVal === 'TRUE') {
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

        const description = (
            (getRowVal(rowData, 'Description') || this.fromExistingAnno(existingCourse, 'description') || '') as string)
            .replace('\\n', ' ').replace(/\n/g, ' ').replace(/\"/g, "'").replace(/\r/g, '').replace('\\r', ' ');

        const existingAnnoItems = existingCourse ? existingCourse.annotations.items : {};

        const annoItems: IAnnotationItems = Object.assign(existingAnnoItems, {
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
        });

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

        if (getRowVal(rowData, 'Prereq_Text') || '') {
            annoItems['prerequisites'] = {
                value: getRowVal(rowData, 'Prereq_Text') as string, type: 'STRING', operator: AnnotationOperator.EQUALS
            };
        }

        const hasPreqColumns = rowData['Prereq_ID'] !== undefined || rowData['Coreq_ID'] !== undefined;
        const statements: CourseStatement[] = existingCourse && !hasPreqColumns ? existingCourse.statements : [];

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

        const course = new Course(
            strippedCourseId,
            courseName,
            new Annotations(annoItems),
            statements
        );

        return course;
    }

    public static courseFromJSON(
        rowData: IRowData,
        existingCourse: Course | undefined,
        parameters: object | undefined
    ): Course | null {
        const cObj = JSON.parse(rowData['JSON_OBJECT']);

        const instructLev = cObj['instructionalLevel'] || 'Untracked';
        const isCte = cObj['cteCourse'] === true ? 1 : 0;
        const isTechPrep = cObj['techPrepCourse'] === true ? 1 : 0;
        const subName = cObj['subjectArea'] ? cObj['subjectArea']['name'].trim() : 'Unknown';
        const subCategory = cObj['subjectArea'] ? cObj['subjectArea']['category'] : 'Basic Skills';
        const combinedSubjectArea = getMigratedSubjectArea(subName, subCategory);
        const desc = cObj['description'] || cObj['_description'];
        const courseId = cObj['id'] || cObj['schoolCode'];
        if (!courseId) {
            console.log('No course ID found', cObj);

            return null;
        }
        if (courseId.includes(',')) {
            console.log(`Course ID cannot contain comma`);

            return null;
        }
        const schoolList = cObj['schools'] || [];
        if (!schoolList.length && cObj['highschoolId']) {
            schoolList.push(cObj['highschoolId']);
        }

        const name = cObj['name'].replace('\\n', ' ').replace(/\n/g, ' ')
            .replace(/\"/g, "'").replace(/\r/g, '').replace('\\r', ' ');

        const annoItems: IAnnotationItems = {
            id: { value: courseId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            number: { value: courseId, type: 'STRING', operator: AnnotationOperator.EQUALS },
            name: { value: name, type: 'STRING', operator: AnnotationOperator.EQUALS },
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

        const strippedCourseId = this.finalCourseId(courseId);

        if (strippedCourseId.length === 0) {
            // course ID is nothing but invalid characters, this has shown up in migrated data
            return null;
        }

        const statements: CourseStatement[] = [];

        let existingPreq: CourseStatement | null = null;
        let existingCoreq: CourseStatement | null = null;

        if (parameters && parameters['prereqFix'] && existingCourse && existingCourse.statements.length) {
            for (const existStmt of existingCourse.statements) {
                if (existStmt.annotations && existStmt.annotations.getValue('coreq')) {
                    existingCoreq = existStmt;
                } else {
                    existingPreq = existStmt;
                }
            }
        }

        if (cObj['coursePrerequisites']) {
            const cs = prereqCourseStatementFromJson(cObj['coursePrerequisites'], existingPreq);
            if (cs) {
                statements.push(cs);
            }
        }

        if (cObj['courseCorequisites']) {
            const cs = prereqCourseStatementFromJson(cObj['courseCorequisites'], existingCoreq);
            if (cs) {
                cs.annotations = Annotations.simple({coreq: true});
                statements.push(cs);
            }
        }

        if (parameters && parameters['prereqFix']) {
            if (existingCourse && statements.length) {
                existingCourse.statements = statements;
                console.log(`updating prereqs for ${existingCourse.name}`);

                return existingCourse;
            }

           return null;
        }

        return new Course(
            strippedCourseId,
            cObj['name'],
            new Annotations(annoItems),
            statements
        );
    }

    public static async getBatchOfCourses(courseIds: string[], namespace: string): Promise<Course[]> {
        if (!courseIds.length) {
            return [];
        }
        const ns = new Namespace(namespace);
        const existingPager = Course.find(ns, {
            findCriteria: {
                name: {
                    operator: 'in',
                    name: courseIds
                }
            }
        });

        try {
            return existingPager.all();
        } catch (err) {
            await sleep(1000);

            return existingPager.all();
        }
    }

    public static async processMappingsByBatch(
        schoolsByCourse: { [key: string]: string[] }, namespace: string
    ): Promise<number> {
        const chunkSize = 20;
        let updatesCount = 0;
        const allCourseIds = Object.keys(schoolsByCourse);
        const chunks = Array.from({ length: Math.ceil(allCourseIds.length / chunkSize) }, (_v, i) =>
            allCourseIds.slice(i * chunkSize, i * chunkSize + chunkSize),
        );
        console.log(`Processing mappings on ${allCourseIds.length} courses in ${chunks.length} chunks of ${chunkSize}`);

        for (const [chunkIdx, idChunk] of chunks.entries()) {
            const courses = await this.getBatchOfCourses(idChunk, namespace);
            let updatesNeeded: Course[] = [];
            for (const foundCourse of courses) {
                const schoolsList = schoolsByCourse[foundCourse.name];
                if (!schoolsList) {
                    continue;
                }
                const existSchools = foundCourse.annotations.getValue('schools') as string[];
                if (!existSchools || JSON.stringify(schoolsList) !== JSON.stringify(existSchools)) {
                    foundCourse.annotations.set(
                        'schools', schoolsList, AnnotationOperator.EQUALS, undefined, 'LIST_STRING'
                    );
                    updatesNeeded.push(foundCourse);
                }
            }
            console.log(`Batch ${chunkIdx}, ${updatesNeeded.length} updates needed`);

            if (updatesNeeded.length > 0) {
                updatesCount += updatesNeeded.length;
                const b = new Batch({namespace: new Namespace(namespace) });
                await b.addItems(updatesNeeded);
                await b.createOrUpdate();
                updatesNeeded = [];
            }
        }

        return updatesCount;
    }
}
