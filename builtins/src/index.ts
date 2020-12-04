import { generateHandler } from "@data-channels/dcSDK";

import {
    Athena,
    Diff,
    Echo,
    Generate,
    Glue,
    GroupBy,
    HelloWorld,
    SecurityScan,
    SESProcessor,
    SNSProcessor,
    Sort,
    Validate,
    ThrowError,
    Translate,
    Webhook,
} from "./processors";

export const builtInHandler = generateHandler({
    echo: Echo,
    translate: Translate,
    sort: Sort,
    validate: Validate,
    hello: HelloWorld,
    helloRow: HelloWorld,
    sns: SNSProcessor,
    email: SESProcessor,
    emailJobInfo: SESProcessor,
    throwError: ThrowError,
    diff: Diff,
    groupby: GroupBy,
    athena: Athena,
    sql: Athena,
    securityscan: SecurityScan,
    generate: Generate,
    dynamicHelloWorld: HelloWorld,
    glue: Glue,
    webhook: Webhook,
});

export * from "./utils";
export * from "./processors";
