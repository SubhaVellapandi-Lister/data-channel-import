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

    private async import(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
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

        const existing = await Program.findOne({ namespace: new Namespace(this.namespace), itemName: programId});

        const classYears = cObj['eligibleClasses'];
        classYears.sort();

        const annoItems: IAnnotationItems = {
            name: { value: cObj['name'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            type: { value: 0, type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            lastSaved: { value: new Date().getTime(), type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            published: { value: cObj['published'], type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            lastPublished: { value: new Date().getTime(), type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            checkedToPublish: { value: cObj['published'], type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            publishedVersion: { value: cObj['published'], type: 'BOOLEAN', operator: AnnotationOperator.EQUALS },
            classYearFrom: { value: classYears[0], type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            classYearTo: { value: classYears.slice(-1)[0], type: 'DECIMAL', operator: AnnotationOperator.EQUALS },
            description: { value: cObj['description'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            descriptionPlainText: { value: cObj['description'], type: 'STRING', operator: AnnotationOperator.EQUALS },
            activeSchools: { value: [], type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            checkedSchools: { value: [], type: 'LIST_STRING', operator: AnnotationOperator.EQUALS },
            publishedSchools: { value: [], type: 'LIST_STRING', operator: AnnotationOperator.EQUALS }
        };

        const statements: TakeStatement[] = [];

        for (const requirement of cObj['requirements']) {
            const reqId = uuidv5(requirement['pk'], this.uuidSeed);
            const statementAnno = Annotations.simple({
                id: reqId,
                name: requirement['name'],
                description: requirement['description'],
                credits: requirement['maximumCredits']
            });
            const rules: ListExpression[] = [];
            for (const rule of requirement['rules']) {
                switch (rule['type']) {
                    case 1:
                        rules.push(this.mandatedRule(rule));
                        break;
                    case 2:
                        rules.push(this.groupOfCoursesRule(rule));
                        break;
                    case 3:
                        rules.push(this.choicesByGradeRule(rule));
                        break;
                    case 4:
                    case 5:
                        rules.push(this.itemsFromListRule(rule));
                        break;
                }
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
            console.log(`Updating ${programId} - ${existing.name}`);
        } else {
            program = new Program(programId, cObj['name'], new Annotations(annoItems), statements);
            this.createdCount += 1;
            status = 'CREATED';
            console.log(`Creating ${programId} - ${program.name}`);
        }

        program.save(new Namespace(this.namespace), 'migration');

        return {
            outputs: {
                default: [ programId, program.name, status ]
            }
        };
    }

    public async before_import(input: IStepBeforeInput) {
        initRulesRepo(input.parameters!);
        this.namespace = input.parameters!['namespace'];
    }

    public async after_import(input: IStepBeforeInput): Promise<IStepAfterOutput> {

        return { results: {
            createdCount: this.createdCount,
            updatedCount: this.updatedCount
        }};
    }

    private mandatedRule(rule: object): ListExpression {
        const exprList: Expression[] = [];
        for (const entry of rule['entries']) {
            const anno = { mandated: true };
            if (entry['gradeLevel'] > 0) {
                anno['grade'] = entry['gradeLevel'];
            }
            exprList.push(new Expression(entry['courseId'], Annotations.simple(anno)));
        }

        const lexp = new ListExpression(exprList, Annotations.simple({
            rule: 0
        }));

        return lexp;
    }

    private itemsFromListRule(rule: object): ListExpression {
        const idents: string[] = [];
        const sortedEntries = rule['entries'];
        sortedEntries.sort((a: object, b: object) => a['priority'] - b['priority']);
        for (const entry of sortedEntries) {
            idents.push(entry['courseId']);
        }

        const lexp = new ListExpression(
            [new ListExpression(idents, undefined, Modifiers.simple({ credits: rule['minCredit']}))],
            Annotations.simple({
                rule: 3
        }));

        return lexp;
    }

    private groupOfCoursesRule(rule: object): ListExpression {
        const idents: string[] = [];
        const sortedEntries = rule['entries'];
        sortedEntries.sort((a: object, b: object) => a['priority'] - b['priority']);
        for (const entry of sortedEntries) {
            idents.push(entry['courseId']);
        }

        const lexp = new ListExpression(
            [new ListExpression(idents)],
            Annotations.simple({
                rule: 2
        }));

        return lexp;
    }

    private choicesByGradeRule(rule: object): ListExpression {
        const entriesByGrade: { [grade: number]: object[] } = [];
        for (const entry of rule['entries']) {
            const gl = entry['gradeLevel'];
            if (!entriesByGrade[gl]) {
                entriesByGrade[gl] = [];
                entriesByGrade[gl].push(entry);
            }
        }
        const grades = Object.keys(entriesByGrade).sort();
        const gradeExpressions: ListExpression[] = [];
        for (const grade of grades) {
            const entries = entriesByGrade[grade].sort((a: object, b: object) => a['priority'] - b['priority']);
            gradeExpressions.push(new ListExpression(
                entries.map((e: object) => e['courseId']),
                Annotations.simple({ grade }),
                Modifiers.simple({ courses: 1 })
            ));
        }

        return new ListExpression(gradeExpressions, Annotations.simple({ rule: 2}));
    }
}
