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

export class PosProcessor extends BaseProcessor {
    private createdCount = 0;
    private updatedCount = 0;
    private namespace = '';
    private uuidSeed = 'ec3d4a8c-f8ac-47d3-bb77-abcadea819d9';

    private async importPoS(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            return {
                outputs: {
                    default: [ 'ID', 'NAME', 'STATUS' ]
                }
            };
        }

        const rowData = input.data;

        const cObj = JSON.parse(rowData['JSON_OBJECT']);

        const programId = uuidv5(cObj['name'], this.uuidSeed);

        console.log('STARTING', programId);

        const existing = await Program.findOne({ namespace: new Namespace(this.namespace), itemName: programId});

        let classYears = cObj['eligibleClasses'];
        if (!classYears || !classYears.length) {
            classYears = [2019, 2020];
        }
        classYears.sort();

        const published = cObj['published'] ? 1 : 0;

        const description = cObj['description'].replace(/\n/g, ' ').replace(/\r/g, '');

        const annoItems: IAnnotationItems = {
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

        const statements: TakeStatement[] = [];

        for (const requirement of cObj['requirements']) {
            const reqId = uuidv5(requirement['pk'].toString(), this.uuidSeed);
            const statementAnno = Annotations.simple({
                id: reqId,
                name: requirement['name'],
                description: requirement['description'].replace(/\n/g, ' ').replace(/\r/g, ''),
                credits: requirement['maximumCredits']
            });
            const rules: ListExpression[] = [];

            function pushRule(expr: ListExpression | null) {
                if (expr) {
                    rules.push(expr);
                } else {
                    console.log(`Empty rule`);
                }
            }
            for (const rule of requirement['rules']) {
                switch (rule['type']) {
                    case 1:
                        pushRule(this.mandatedRule(rule));
                        break;
                    case 2:
                        pushRule(this.groupOfCoursesRule(rule));
                        break;
                    case 3:
                        pushRule(this.choicesByGradeRule(rule));
                        break;
                    case 4:
                    case 5:
                        pushRule(this.itemsFromListRule(rule));
                        break;
                }
            }
            if (!rules.length) {
                console.log(`Skipping empty requirement ${requirement['name']}`);
                continue;
            }
            statements.push(new TakeStatement(rules, undefined, statementAnno));
        }

        let program: Program;
        let status = 'UPDATED';
        if (existing) {
            existing.annotations = new Annotations(annoItems);
            existing.statements = statements;
            program = existing;
            this.updatedCount += 1;
            console.log(`Updating ${programId} - ${existing.display}`);
        } else {
            program = new Program(programId, cObj['name'], new Annotations(annoItems), statements);
            this.createdCount += 1;
            status = 'CREATED';
            console.log(`Creating ${programId} - ${program.display}`);
        }

        await program.save(new Namespace(this.namespace), 'migration');

        console.log(`SAVED ${programId} - ${program.display}`);

        return {
            outputs: {
                default: [ programId, program.name, status ]
            }
        };
    }

    public async before_importPoS(input: IStepBeforeInput) {
        initRulesRepo(input.parameters!);
        this.namespace = input.parameters!['namespace'];
    }

    public async after_importPoS(input: IStepBeforeInput): Promise<IStepAfterOutput> {

        return { results: {
            createdCount: this.createdCount,
            updatedCount: this.updatedCount
        }};
    }

    private mandatedRule(rule: object): ListExpression | null {
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

    private itemsFromListRule(rule: object): ListExpression | null {
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

    private groupOfCoursesRule(rule: object): ListExpression | null {
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

    private choicesByGradeRule(rule: object): ListExpression | null {
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
            const entries = entriesByGrade[grade].sort((a: object, b: object) => a['priority'] - b['priority']);
            gradeExpressions.push(new ListExpression(
                entries.map((e: object) => e['courseId'].toString()),
                Annotations.simple({ grade: parseInt(grade) }),
                Modifiers.simple({ courses: 1 })
            ));
        }
        if (!gradeExpressions.length) {
            return null;
        }

        return new ListExpression(gradeExpressions, Annotations.simple({ rule: 2}));
    }
}
