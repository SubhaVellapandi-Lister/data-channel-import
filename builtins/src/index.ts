import { generateHandler } from "@data-channels/dcSDK";
import Athena from "./processors/Athena";
import Diff from "./processors/Diff";
import Echo from "./processors/Echo";
import Generate from "./processors/Generate";
import GroupBy from "./processors/GroupBy";
import HelloWorld from "./processors/HelloWorld";
import SecurityScan from "./processors/SecurityScan";
import SESProcessor from "./processors/SES";
import SNSProcessor from "./processors/SNS";
import Sort from "./processors/Sort";
import ThrowError from "./processors/ThrowError";
import Translate from "./processors/Translate";
import Validate from "./processors/Validate";

export const builtInHandler = generateHandler({
    echo:  Echo,
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
    generate: Generate
});
