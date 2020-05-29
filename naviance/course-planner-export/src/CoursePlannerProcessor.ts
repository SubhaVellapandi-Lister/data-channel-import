import {ProgramAudit, RequirementAudit} from "@academic-planner/apSDK";

export class CoursePlannerProcessor {

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
}
