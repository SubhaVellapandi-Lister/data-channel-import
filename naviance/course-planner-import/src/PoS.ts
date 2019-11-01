import {
    AnnotationOperator,
    Annotations,
    Batch,
    Course,
    Expression,
    IAnnotationItems,
    ListExpression,
    Modifiers,
    Namespace,
    Program,
    TakeStatement
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IRowData,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import uuidv5 from "uuid/v5";
import { getRowVal, initRulesRepo, prereqCourseStatement } from "./Utils";

export class PoSImport {
    private createdCount = 0;
    private updatedCount = 0;
    private namespace = '';
    private uuidSeed = 'ec3d4a8c-f8ac-47d3-bb77-abcadea819d9';

    public static annotations(cObj: any): IAnnotationItems {
        let classYears = cObj['eligibleClasses'];
        if (!classYears || !classYears.length) {
            classYears = [2019, 2020];
        }
        classYears.sort();

        const published = cObj['published'] ? 1 : 0;

        const description = cObj['description'].replace(/\n/g, ' ').replace(/\r/g, '');

        return {
            name: { value: cObj['name'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            type: { value: 0, type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            lastSaved: { value: new Date().getTime(), type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            published: { value: published, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            lastPublished: { value: new Date().getTime(), type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            checkedToPublish: { value: published, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            publishedVersion: { value: published, type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            classYearFrom: { value: classYears[0], type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            classYearTo: { value: classYears.slice(-1)[0], type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            description: { value: description, type: 'STRING', operator: AnnotationOperator.EQUALS },
            descriptionPlainText: { value: description, type: 'STRING', operator: AnnotationOperator.EQUALS },
            activeSchools: { value: [], type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            checkedSchools: { value: [], type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            publishedSchools: { value: [], type: 'LIST_STRING', operator: AnnotationOperator.EQUALS }
        };
    }

    public static requirements(cObj: any, uuidSeed: string): TakeStatement[] {
        const statements: TakeStatement[] = [];
        const cpRequirements = cObj['requirements'] || cObj['pathway']['requirements'];

        for (const cpReq of cpRequirements) {
            const reqPk = cpReq['pk'] || cpReq['requirementId'];
            const reqDetails = cpReq['requirement'] || cpReq;
            const reqId = uuidv5(reqPk.toString(), uuidSeed);
            const statementAnno = Annotations.simple({
                id: reqId,
                name: reqDetails['name'],
                description: reqDetails['description'].replace(/\n/g, ' ').replace(/\r/g, ''),
                credits: reqDetails['maximumCredits']
            });
            const rules: ListExpression[] = [];

            function pushRule(expr: ListExpression | null) {
                if (expr) {
                    rules.push(expr);
                } else {
                    console.log(`Empty rule`);
                }
            }
            for (const rule of reqDetails['rules']) {
                switch (rule['type']) {
                    case 1:
                        pushRule(this.mandatedRule(rule));
                        break;
                    case 2:
                        pushRule(this.groupOfCoursesRule(rule));
                        break;
                    case 3:
                    case 6:
                        pushRule(this.choicesByGradeRule(rule));
                        break;
                    case 4:
                    case 5:
                        pushRule(this.itemsFromListRule(rule));
                        break;
                }
            }
            if (!rules.length) {
                console.log(`Skipping empty requirement ${reqDetails['name']}`);
                continue;
            }
            statements.push(new TakeStatement(rules, undefined, statementAnno));
        }

        return statements;
    }

    public static mandatedRule(rule: object): ListExpression | null {
        const exprList: Expression[] = [];
        for (const entry of rule['entries']) {
            if (!entry['courseId']) {
                continue;
            }
            const anno = { mandated: true };
            const gradeLevel = parseInt(entry['gradeLevel']);
            if (gradeLevel && gradeLevel > 0) {
                anno['grade'] = gradeLevel;
            }
            exprList.push(new Expression(entry['courseId'].toString(), Annotations.simple(anno)));
        }
        if (!exprList.length) {
            return null;
        }

        const lexp = new ListExpression(exprList, Annotations.simple({
            rule: 0
        }));

        return lexp;
    }

    public static itemsFromListRule(rule: object): ListExpression | null {
        const idents: string[] = [];
        const sortedEntries = rule['entries'];
        sortedEntries.sort((a: object, b: object) => a['priority'] - b['priority']);
        for (const entry of sortedEntries) {
            if (!entry['courseId']) {
                console.log('No course id for entry', entry);
                continue;
            }
            idents.push(entry['courseId'].toString());
        }

        if (!idents.length) {
            return null;
        }

        const lexp = new ListExpression(
            [new ListExpression(idents, undefined, Modifiers.simple({ credits: rule['minCredit']}))],
            Annotations.simple({
                rule: 3
        }));

        return lexp;
    }

    public static groupOfCoursesRule(rule: object): ListExpression | null {
        const idents: string[] = [];
        const sortedEntries = rule['entries'];
        sortedEntries.sort((a: object, b: object) => a['priority'] - b['priority']);
        for (const entry of sortedEntries) {
            if (entry['courseId']) {
                idents.push(entry['courseId'].toString());
            }
        }
        if (!idents.length) {
            return null;
        }
        const lexp = new ListExpression(
            [new ListExpression(idents)],
            Annotations.simple({
                rule: 1
        }));

        return lexp;
    }

    public static choicesByGradeRule(rule: object): ListExpression | null {
        const entriesByGrade: { [grade: number]: object[] } = [];
        for (const entry of rule['entries']) {
            if (!entry['courseId']) {
                continue;
            }
            const gl = parseInt(entry['gradeLevel']);
            if (!entriesByGrade[gl]) {
                entriesByGrade[gl] = [];
            }
            entriesByGrade[gl].push(entry);
        }
        const grades = Object.keys(entriesByGrade).sort((g1, g2) => parseInt(g1) - parseInt(g2));
        const gradeExpressions: ListExpression[] = [];
        for (const grade of grades) {
            const entriesBySequence: { [sequenceId: number]: object[] } = {};
            for (const entry of entriesByGrade[grade]) {
                if (!entriesBySequence[entry.sequenceId]) {
                    entriesBySequence[entry.sequenceId] = [];
                }
                entriesBySequence[entry.sequenceId].push(entry);
            }
            const sequences = Object.keys(entriesBySequence).sort();
            for (const sequenceId of sequences) {
                const entries = entriesBySequence[sequenceId]
                    .sort((a: object, b: object) => a['priority'] - b['priority']);
                gradeExpressions.push(new ListExpression(
                    entries.map((e: object) => e['courseId'].toString()),
                    Annotations.simple({ grade: parseInt(grade) }),
                    Modifiers.simple({ courses: 1 })
                ));
            }
        }
        if (!gradeExpressions.length) {
            return null;
        }

        return new ListExpression(gradeExpressions, Annotations.simple({ rule: 2}));
    }
}
