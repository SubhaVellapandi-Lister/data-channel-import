import {
    AnnotationOperator,
    Annotations,
    Expression,
    IAnnotationItems,
    ListExpression,
    Modifiers,
    TakeStatement
} from "@academic-planner/apSDK";
import uuidv5 from "uuid/v5";

export class PoSImport {
    private static uuidSeed = 'ec3d4a8c-f8ac-47d3-bb77-abcadea819d9';
    private createdCount = 0;
    private updatedCount = 0;
    private namespace = '';

    private static courseIdIsValid(entry: object): boolean {
        return entry['courseId']
            && entry['courseId'].toString().replace(/\s/g, '').replace(/\*/g, '').split('(')[0].length > 0;
    }

    private static courseIdString(entry: object): string {
        return entry['courseId'].toString().replace(/\s/g, '').replace(/\*/g, '').split('(')[0];
    }

    private static findCredits(source: object): number {
        return source['minimumCredits']
            || source['minimumCredit']
            || source['minCredit']
            || source['maximumCredits']
            || source['maximumCredit']
            || source['maxCredit']
            || 0;
    }

    public static annotations(cObj: any, singleHighSchoolId: string): IAnnotationItems {
        let classYears = cObj['eligibleClasses'];
        if (!classYears || !classYears.length) {
            classYears = [2019, 2020];
        }
        classYears.sort();

        let groupRestrictions: string[] = [];
        if (cObj['schoolStudentGroups']) {
            groupRestrictions = cObj['schoolStudentGroups'].map((ssg: any) => ssg.id.toString());
        }

        const published = cObj['published'] ? 1 : 0;
        const publishedSchools = cObj['publishedSchools'] || [];

        if (!publishedSchools.length && singleHighSchoolId && published) {
            publishedSchools.push(singleHighSchoolId);
        }

        const description = cObj['description'].replace(/\n/g, ' ').replace(/\r/g, '');
        const activeSchools = cObj['status'] ? publishedSchools : [];

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
            activeSchools: { value: activeSchools, type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            checkedSchools: { value: publishedSchools, type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            publishedSchools: { value: publishedSchools, type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            groupRestrictions: { value: groupRestrictions, type: 'LIST_STRING', operator: AnnotationOperator.EQUALS }
        };
    }

    public static requirements(cObj: any, uuidSeed: string): TakeStatement[] {
        const statements: TakeStatement[] = [];
        let cpRequirements = cObj['requirements'] || [];
        if (!cpRequirements.length && cObj['pathway']) {
            cpRequirements = cObj['pathway']['requirements'] || [];
        }

        for (const cpReq of cpRequirements) {
            const reqPk = cpReq['pk'] || cpReq['requirementId'];
            const reqDetails = cpReq['requirement'] || cpReq;
            if (!reqDetails['rules'].length && cpReq['rules']) {
                // combined reqs get rules at higher level
                reqDetails['rules'] = cpReq['rules'];
            }
            const reqId = uuidv5(reqPk.toString(), uuidSeed);
            const reqCredits = this.findCredits(reqDetails);
            const statementAnno = Annotations.simple({
                id: reqId,
                name: reqDetails['name'],
                description: (reqDetails['description'] || '').replace(/\n/g, ' ').replace(/\r/g, ''),
                credits: reqCredits
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
                        pushRule(this.mandatedRule(reqId, rule));
                        break;
                    case 2:
                        pushRule(this.groupOfCoursesRule(reqId, rule));
                        break;
                    case 3:
                    case 6:
                        pushRule(this.choicesByGradeRule(reqId, rule));
                        break;
                    case 4:
                    case 5:
                    default:
                        pushRule(this.itemsFromListRule(reqId, rule));
                        break;
                }
            }
            if (!rules.length) {
                console.log(`Skipping empty requirement ${reqDetails['name']}`);
                continue;
            }

            const finalExp = new ListExpression(
                rules,
                undefined,
                Modifiers.simple({credits: reqCredits})
            );
            statements.push(new TakeStatement(finalExp, undefined, statementAnno));
        }

        return statements;
    }

    public static mandatedRule(reqId: string, rule: object): ListExpression | null {
        const exprList: Expression[] = [];
        for (const entry of rule['entries']) {
            if (!this.courseIdIsValid(entry)) {
                continue;
            }
            const gradeLevel = parseInt(entry['gradeLevel']);
            let gradeLevelModifier;
            const anno = {
                mandated: true,
                shareGroup: uuidv5(reqId + rule['pk'] + (gradeLevel ? gradeLevel.toString() : ''), this.uuidSeed)
             };

            if (gradeLevel && gradeLevel > 0) {
                anno['grade'] = gradeLevel;
                gradeLevelModifier = Modifiers.simple({gradeLevel});
            }
            exprList.push(
                new Expression(
                    this.courseIdString(entry),
                    Annotations.simple(anno),
                    gradeLevelModifier
                )
            );
        }
        if (!exprList.length) {
            return null;
        }

        const lexp = new ListExpression(exprList, Annotations.simple({
            rule: 0
        }));

        return lexp;
    }

    public static itemsFromListRule(reqId: string, rule: object): ListExpression | null {
        const idents: string[] = [];
        const sortedEntries = rule['entries'];
        sortedEntries.sort((a: object, b: object) => a['priority'] - b['priority']);
        for (const entry of sortedEntries) {
            if (!this.courseIdIsValid(entry)) {
                console.log('No course id for entry', entry);
                continue;
            }
            idents.push(this.courseIdString(entry));
        }

        if (!idents.length) {
            return null;
        }

        const ruleCredits = this.findCredits(rule);
        const mods = ruleCredits ? Modifiers.simple({ credits: ruleCredits}) : undefined;

        const lexp = new ListExpression(
            [new ListExpression(
                idents,
                Annotations.simple({shareGroup: uuidv5(reqId + rule['pk'], this.uuidSeed)}),
                mods
            )],
            Annotations.simple({
                rule: 3
        }));

        return lexp;
    }

    public static groupOfCoursesRule(reqId: string, rule: object): ListExpression | null {

        const entriesBySequence: { [sequenceId: number]: object[] } = {};
        for (const entry of rule['entries']) {
            if (!entriesBySequence[entry.sequenceId]) {
                entriesBySequence[entry.sequenceId] = [];
            }
            entriesBySequence[entry.sequenceId].push(entry);
        }
        const childLists: ListExpression[] = [];
        const sequences = Object.keys(entriesBySequence).sort();
        for (const sequenceId of sequences) {
            const sortedEntries = entriesBySequence[sequenceId];
            sortedEntries.sort((a: object, b: object) => a['priority'] - b['priority']);
            const idents: string[] = [];
            for (const entry of sortedEntries) {
                if (this.courseIdIsValid(entry)) {
                    idents.push(this.courseIdString(entry));
                }
            }
            if (!idents.length) {
                continue;
            }
            childLists.push(
                new ListExpression(
                    idents.map((cnum, idx) =>
                        new Expression(
                            cnum,
                            Annotations.simple({ shareGroup: uuidv5(reqId + idx + cnum, this.uuidSeed)})
                        )
                    )
                )
            );
        }

        if (!childLists.length) {
            return null;
        }

        const lexp = new ListExpression(
            [childLists],
            Annotations.simple({
                rule: 1
            }),
            undefined,
            undefined,
            undefined,
            1
        );

        return lexp;
    }

    public static choicesByGradeRule(reqId: string, rule: object): ListExpression | null {
        const entriesByGrade: { [grade: number]: object[] } = [];
        for (const entry of rule['entries']) {
            if (!this.courseIdIsValid(entry)) {
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
                const gradeLevel = parseInt(grade);
                const tempAnnotation = new Annotations({
                    courses: {
                        value: 1,
                        operator: AnnotationOperator.LTE
                    },
                    gradeLevel: {
                        value: gradeLevel,
                        operator: AnnotationOperator.EQUALS
                    }
                });
                const modifier = new Modifiers(tempAnnotation.items);
                if (entries.length) {
                    gradeExpressions.push(new ListExpression(
                        entries.map((e: object) => this.courseIdString(e)),
                        Annotations.simple({
                            grade: gradeLevel,
                            shareGroup: uuidv5(reqId + sequenceId + grade, this.uuidSeed)
                        }),
                        modifier
                    ));
                }
            }
        }
        if (!gradeExpressions.length) {
            return null;
        }

        return new ListExpression(gradeExpressions, Annotations.simple({ rule: 2}));
    }
}
