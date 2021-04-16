import { generateHandler } from "@data-channels/dcSDK";

import {
    Athena,
    Diff,
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
    Delete,
    Import,
    PsQuery
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
    enumerate: Enumerate,
    psQuery: PsQuery,
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
    delete: Delete,
    import: Import
});

export * from "./utils";
export * from "./processors";
export * from "./processors/Validate/DateUtil";
export * from "./processors/Validate/DateValidator";
export * from "./processors/Validate/Validate.interface";
export * from "./processors/Match/Match.interface";
