import {IProgramDetailed} from "@academic-planner/academic-planner-common";
import {ProgramAudit} from "@academic-planner/apSDK";
import 'jest';
import {PlanAudit} from "./PlanAudit";

describe('PlanAudit tests', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('credits in plan regression', async () => {
        const progAudit = new ProgramAudit(rawProgramAuditDetail, []);
        const ret = PlanAudit.creditsInPlan(progAudit);
        expect(ret).toEqual(0);
    });

    test('plan green checkmark regression', async () => {
        const progAudit = new ProgramAudit(rawProgramAuditDetail, []);
        const ret = PlanAudit.isAllMet(progAudit);
        expect(ret).toEqual(true);
    });
});

const rawProgramAuditDetail: IProgramDetailed = {
    namespace: "",
    version: "",
    program: {
        name: "",
        display: "",
        type: "",
        annotations: {
            "": {
                operator: "",
                value: "",
                annotationId: ""
            }
        },
        statements: [
            {
                auditResult: {
                    isMet: false,
                    usedRecords: [
                        {
                            studentRecordId: "",
                            statementUnique: "",
                            creditsUsed: 0,
                            shareGroup: ""
                        }
                    ],
                    creditProgress: {
                        creditsRequired: 0,
                        creditsGradedUsed: 0,
                        creditsPlannedUsed: 0,
                        creditsRemaining: 0,
                        catalogCreditsRemaining: 0
                    },
                    usedRecordMap: {}
                }
            }
        ],
        auditResult: {
            isMet: false,
            usedRecords: [
                {
                    studentRecordId: "",
                    statementUnique: "",
                    creditsUsed: 0,
                    shareGroup: ""
                }
            ],
            creditProgress: {
                creditsRequired: 0,
                creditsGradedUsed: 0,
                creditsPlannedUsed: 0,
                creditsRemaining: 0,
                catalogCreditsRemaining: 0
            },
            usedRecordMap: {}
        }
    },
    progress: {
        credits: {
            creditsRequired: 0,
            creditsGradedUsed: 0,
            creditsPlannedUsed: 0,
            creditsRemaining: 0,
            catalogCreditsRemaining: 0
        },
        statementsMet: 0,
        statementsTotal: 0
    }

};
