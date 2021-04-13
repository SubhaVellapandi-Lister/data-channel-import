import { generateHandler } from "@data-channels/dcSDK";

import {
    Aggregate,
    Athena,
    Diff,
    DragonImport,
    Echo,
    Enumerate,
    Generate,
    Glue,
    GroupBy,
    HelloWorld,
    Match,
    SecurityScan,
    SESProcessor,
    SNSProcessor,
    Sort,
    Validate,
    ThrowError,
    Translate,
    Webhook,
    Delete
} from "./processors";

export const builtInHandler = generateHandler({
    aggregate: Aggregate,
    echo: Echo,
    dragonImport: DragonImport,
    translate: Translate,
    sort: Sort,
    validate: Validate,
    hello: HelloWorld,
    helloRow: HelloWorld,
    sns: SNSProcessor,
    email: SESProcessor,
    emailJobInfo: SESProcessor,
    enumerate: Enumerate,
    matchFields: Match,
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
    delete: Delete
});

export * from "./utils";
export * from "./processors";
export * from "./processors/Validate/DateUtil";
export * from "./processors/Validate/DateValidator";
export * from "./processors/Validate/Validate.interface";
export * from "./processors/Match/Match.interface";
