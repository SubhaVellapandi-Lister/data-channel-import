import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { initRulesRepo } from "./Utils";

export class StudentCoursePlanRecalculation extends BaseProcessor {
    public async before_recalculate(input: IStepBeforeInput) {
        initRulesRepo(input.parameters!);
    }

    public async recalculate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
      console.info(`Started student course plan recalculation job with filters ${input.parameters}`);
    }
}
