import {IProgramDetailed} from "@academic-planner/academic-planner-common";
import {
    Annotations,
    ITotalCreditCounts,
    Program,
    ProgramAudit,
    SlimStudentPlan
} from "@academic-planner/apSDK";
import 'jest';
import {PlanAudit} from "./PlanAudit";

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

    describe('Audit Plan Credits', () => {
        const mockPlan = (opts: { programDetailsMock: ProgramAudit[] }) => {
            return new SlimStudentPlan({
                guid: 'student-plan-1',
                scope: "scope",
                created: "2021-03-16T15:32:02.119Z",
                studentPrincipleId: "1000",
                authorPrincipleId: "1000",
                isDeleted: false,
                buildProgressPercent: 100,
                expanded: {
                    audits: {
                        programDetails: [...opts.programDetailsMock]
                    }
                }
            });
        };

        const posProgramAuditMock = new ProgramAudit(rawProgramAuditDetail, []);
        const pathwayProgramAuditMock = new ProgramAudit(rawProgramAuditDetail, []);
        let posCalculateCreditTotalsSpy: jest.SpyInstance;
        let pathwayCalculateCreditTotalsSpy: jest.SpyInstance;

        beforeEach(() => {
            posCalculateCreditTotalsSpy = jest.spyOn(posProgramAuditMock, 'calculateCreditTotals').mockReturnValue({
                totalCreditsRequiredMinusAttempted: 10,
            } as ITotalCreditCounts);

            pathwayCalculateCreditTotalsSpy = jest.spyOn(pathwayProgramAuditMock, 'calculateCreditTotals').mockReturnValue({
                totalCreditsAttempted: 2
            } as ITotalCreditCounts);
        })

        it('should audit credits for plan without pathway', () => {
            const plan = mockPlan({programDetailsMock: [posProgramAuditMock]})
            const {pathwayCreditRemaining, posCreditRemaining, totalCreditRemaining} = PlanAudit.auditCredits({
                plan,
                pathwayProgram: undefined
            })
            expect(posCreditRemaining).toBe(10); // result from calculateCreditTotals
            expect(pathwayCreditRemaining).toBe(0); // no pathway, no credit remaining to calculate
            expect(totalCreditRemaining).toBe(10);
            expect(posCalculateCreditTotalsSpy).toHaveBeenCalled();
        });

        it('should audit credits for plan with pathway', () => {
            const totalCredits = 6;
            const pathwayMock = {
                annotations: Annotations.simple({
                    totalCredits
                })
            } as Program;

            const plan = mockPlan({
                programDetailsMock: [
                    posProgramAuditMock,
                    pathwayProgramAuditMock
                ]
            })

            const {pathwayCreditRemaining, posCreditRemaining, totalCreditRemaining} = PlanAudit.auditCredits({
                plan,
                pathwayProgram: pathwayMock
            })

            expect(posCreditRemaining).toBe(10); // result from calculateCreditTotals
            expect(pathwayCreditRemaining).toBe(4); // totalCredits - totalCreditsAttempted
            expect(totalCreditRemaining).toBe(14);
            expect(posCalculateCreditTotalsSpy).toHaveBeenCalled();
            expect(pathwayCalculateCreditTotalsSpy).toHaveBeenCalled();
        });
    })
});
