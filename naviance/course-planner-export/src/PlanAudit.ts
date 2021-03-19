import {Program, ProgramAudit, RequirementAudit, SlimStudentPlan} from "@academic-planner/apSDK";

interface AuditCreditProps {
    plan: SlimStudentPlan;
    pathwayProgram: Program | undefined;
}

interface AuditedCredits {
    posCreditRemaining: number;
    pathwayCreditRemaining: number;
    totalCreditRemaining: number;
}

export class PlanAudit {

    /**
     * See CP service creditTotals.totalCreditsAttempted
     * @param programAudit
     */
    static creditsInPlan(programAudit: ProgramAudit | null) {
        if (programAudit == null) {
            return 0;
        }
        const creditTotals = programAudit.calculateCreditTotals();

        return creditTotals.totalCreditsAttempted;
    }

    /**
     * See CP service calculateCredits. When stillNeeded is zero, it shows the green checkmark.
     * @param programAudit
     */
    static isAllMet(programAudit: ProgramAudit | null) {
        if (programAudit == null) {
            return false;
        }
        const isAllMet = programAudit.requirements.reduce(
            (total: number, req: RequirementAudit) =>
                (total += req.calculateCreditTotals().totalCreditsRequiredMinusAttempted),
                0,
        );

        return isAllMet === 0;
    }

    static auditCredits({plan, pathwayProgram}: AuditCreditProps ): AuditedCredits {
        let pathwayCreditRemaining = 0;
        const [ posAudit, pathwayAudit ] = plan.audits!.programDetails;

        // Pathway credits are calculated in a different way
        if (pathwayAudit && pathwayProgram) {
            const totalCredits = pathwayProgram!.annotations.getValue('totalCredits') as number
            const  { totalCreditsAttempted }= pathwayAudit.calculateCreditTotals()
            pathwayCreditRemaining = totalCredits - totalCreditsAttempted
        }

        const {totalCreditsRequiredMinusAttempted: posCreditRemaining} = posAudit.calculateCreditTotals();

        return  {
            posCreditRemaining,
            pathwayCreditRemaining,
            totalCreditRemaining: posCreditRemaining + pathwayCreditRemaining
        }
    }
}
