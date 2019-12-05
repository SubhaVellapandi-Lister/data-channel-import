import { jobConfigFromEnv } from "@data-channels/dcSDK/dist/utils/docker";
import BuiltInRouter from "./Router";

(async () => {
    const jobConf = jobConfigFromEnv();
    await BuiltInRouter.handleJobEvent({
        Job: jobConf,
        TaskToken: process.env.DCHAN_JOB_TASK_TOKEN
    }, '');
})();
