import { IVpc, Vpc, ISecurityGroup, SecurityGroup, SubnetType, SubnetSelection, Subnet } from '@aws-cdk/aws-ec2';
import { IAccessPoint, AccessPoint, FileSystem as efsFileSystem } from '@aws-cdk/aws-efs';
import { PolicyStatement, Effect, Role, User, AccountPrincipal, ArnPrincipal, CfnAccessKey } from '@aws-cdk/aws-iam';
import { Runtime, FileSystem as lambdaFileSystem, LayerVersion, Code } from '@aws-cdk/aws-lambda';
import { LogLevel, NodejsFunction, NodejsFunctionProps } from '@aws-cdk/aws-lambda-nodejs';
import { App, Stack, StackProps, CfnOutput, Aws, Duration } from '@aws-cdk/core';
import config from "config";

import { tagAppStack } from "./permBoundary";

let functionName = config.get<string>('cdk.functionName');
let stackName = config.get<string>('cdk.stackName');

const environment = config.get<string>('cdk.environment');
const snsPublish = config.get<boolean>('cdk.permissions.snsPublish');
const sesSend = config.get<boolean>('cdk.permissions.sesSend');
const athenaGlue = config.get<boolean>('cdk.permissions.athenaGlue');
const athenaWorkGroup = config.get<string>('cdk.permissions.athenaWorkGroup');

const useEfs = config.get<boolean>('cdk.efs.useEfs');
const fileSystemId = config.get<string>('cdk.efs.fileSystemId');
const accessPointId = config.get<string>('cdk.efs.accessPointId');
const securityGroupId = config.get<string>('cdk.efs.securityGroupId');
const vpcId = config.get<string>('cdk.efs.vpcId');
const mountPath = config.get<string>('cdk.efs.mountPath');

const stubSecurityScan = config.get<boolean>('cdk.securityScan.stub');

if (functionName.includes('${environment}')) {
    functionName = functionName.replace('${environment}', environment);
}

if (stackName.includes('${environment}')) {
    stackName = stackName.replace('${environment}', environment);
}

export class BuiltinsLambdaStack extends Stack {
    constructor(scope: App, id: string, props: StackProps) {
        super(scope, id, props);

        let vpc!: IVpc;
        let securityGroup!: ISecurityGroup;
        let accessPoint!: IAccessPoint;
        let fileSystem!: lambdaFileSystem;

        let efsUsageRole!: PolicyStatement;

        if (useEfs && fileSystemId) {
            vpc = Vpc.fromLookup(this, vpcId, { vpcId });
            securityGroup = SecurityGroup.fromSecurityGroupId(this, 'ss-dc-sg', securityGroupId);
            accessPoint = AccessPoint.fromAccessPointAttributes(this, 'ss-dc-ap', {
                accessPointId: accessPointId,
                fileSystem: efsFileSystem.fromFileSystemAttributes(this, 'ss-dc-efs', {
                    fileSystemId: fileSystemId,
                    securityGroup: securityGroup
                })
            }),
            fileSystem = lambdaFileSystem.fromEfsAccessPoint(
                accessPoint,
                mountPath
            );

            efsUsageRole = new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "elasticfilesystem:ClientMount",
                    "elasticfilesystem:ClientRootAccess",
                    "elasticfilesystem:ClientWrite",
                    "elasticfilesystem:DescribeMountTargets"
                ],
                resources: [accessPoint.accessPointArn]
            });
        }

        const builtinsProps: NodejsFunctionProps = {
            functionName,
            handler: 'builtInHandler',
            runtime: Runtime.NODEJS_12_X,
            memorySize: 3000,
            timeout: Duration.seconds(300),
            entry: `${__dirname}/../index.ts`,
            bundling: {
                minify: false,
                sourceMap: true,
                logLevel: LogLevel.ERROR,
                externalModules: ['aws-sdk', 'pg-native']
            },
            layers: [new LayerVersion(this, 'ss-config-core-layer', { code: Code.fromAsset(`${__dirname}/../../config`) })]
        };

        const genericEnvironmentVars = {
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
            STUB_SECURITY_SCAN: String(stubSecurityScan)
        };

        const efsEnvironmentVars = {
            AWS_EFS_PATH: mountPath
        };

        let builtins: NodejsFunction;
        if (useEfs) {
            console.log('Deploying lambda with EFS-Config');
            builtins = new NodejsFunction(this, 'ss-dc-Builtins', {
                ...builtinsProps,
                vpc: vpc,
                securityGroups: [securityGroup],
                vpcSubnets: { subnetType: SubnetType.PRIVATE, onePerAz: true },
                filesystem: fileSystem,
                environment: {
                    ...genericEnvironmentVars,
                    ...efsEnvironmentVars
                }
            });

            builtins.addToRolePolicy(efsUsageRole);
        } else {
            builtins = new NodejsFunction(this, 'ss-dc-Builtins', {
                ...builtinsProps,
                environment: {
                    ...genericEnvironmentVars
                }
            });
        }

        builtins.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["ssm:GetParameter", "ssm:GetParameters"],
            resources: ["arn:aws:ssm:*:*:parameter/data-channels*"]
        }));

        if (snsPublish) {
            builtins.addToRolePolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["SNS:Publish"],
                resources: ["*"]
            }));
        }

        if (sesSend) {
            builtins.addToRolePolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["SES:SendEmail", "SES:SendRawEmail"],
                resources: ["*"]
            }));
        }

        if (athenaGlue) {
            builtins.addToRolePolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "s3:GetBucketLocation",
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts"
                ],
                resources: ["arn:aws:s3:::data-channels-work-*"]
            }));

            builtins.addToRolePolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["s3:*"],
                resources: ["arn:aws:s3:::data-channels-work-*/workspace/*"]
            }));

            builtins.addToRolePolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["athena:StartQueryExecution", "athena:GetQueryExecution"],
                resources: [`arn:aws:athena:*:*:workgroup/${athenaWorkGroup}`]
            }));

            builtins.addToRolePolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["glue:*"],
                resources: [
                    "arn:aws:glue:*:*:catalog",
                    "arn:aws:glue:*:*:database/*dchan*",
                    "arn:aws:glue:*:*:database/*data-channel*",
                    "arn:aws:glue:*:*:table/*dchan*",
                    "arn:aws:glue:*:*:table/*data-channel*",
                    "arn:aws:glue:*:*:job/*data-channel*",
                    "arn:aws:glue:*:*:userDefinedFunction/*dchan*"
                ]
            }));

            builtins.addToRolePolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["iam:PassRole"],
                resources: ["arn:aws:iam::*:role/*data-channel*"]
            }));
        }

        new CfnOutput(this, 'lambda-ARN', { value: builtins.functionArn });
    }
}

const app = new App();

const coreStack = new BuiltinsLambdaStack(app, 'ss-dc-Builtins-stack', {
    stackName,
    env: {
        region: process.env.CDK_DEFAULT_REGION,
        account: process.env.CDK_DEFAULT_ACCOUNT
    }
});

tagAppStack(coreStack);
