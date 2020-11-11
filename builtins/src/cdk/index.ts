import ec2 = require('@aws-cdk/aws-ec2');
import efs = require('@aws-cdk/aws-efs');
import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');
import config from "config";

import { tagAppStack } from "./permBoundary";

let functionName = config.get<string>('cdk.functionName');
const environment = config.get<string>('cdk.environment');
let stackName = config.get<string>('cdk.stackName');
const snsPublish = config.get<boolean>('cdk.permissions.snsPublish');
const sesSend = config.get<boolean>('cdk.permissions.sesSend');
const athenaGlue = config.get<boolean>('cdk.permissions.athenaGlue');
const athenaWorkGroup = config.get<string>('cdk.permissions.athenaWorkGroup');

const fileSystemId = config.get<string>('cdk.efs.fileSystemId');
const securityGroupId = config.get<string>('cdk.efs.securityGroupId');
const vpcId = config.get<string>('cdk.efs.vpcId');
const mountPath = config.get<string>('cdk.efs.mountPath');

if (functionName.includes('${environment}')) {
    functionName = functionName.replace('${environment}', environment);
}

if (stackName.includes('${environment}')) {
    stackName = stackName.replace('${environment}', environment);
}

export class BuiltinsLambdaStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: cdk.StackProps) {
        super(scope, id, props);
        const vpc = ec2.Vpc.fromLookup(this, vpcId, { vpcId });
        const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'ss-dc-sg', securityGroupId)
        const accessPoint = new efs.AccessPoint(this, "ap", {
            fileSystem: efs.FileSystem.fromFileSystemAttributes(this, 'ss-dc-efs', {
                fileSystemId: fileSystemId,
                securityGroup: securityGroup
            }),
            createAcl: { ownerGid: "1000", ownerUid: "1000", permissions: "777" },
            posixUser: { uid: "1000", gid: "1000" },
            path: mountPath
        });

        const builtins = new lambda.Function(this, 'ss-dc-Builtins', {
            functionName,
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: 'dist/index.builtInHandler',
            code: lambda.Code.asset('./data-channels-builtin-processors.zip'),
            memorySize: 3000,
            timeout: cdk.Duration.seconds(900),
            vpc: vpc,
            securityGroups: [securityGroup],
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE, onePerAz: true },
            filesystem: lambda.FileSystem.fromEfsAccessPoint(
                accessPoint,
                mountPath
            ),
            environment: {
                AWS_EFS_PATH: mountPath,
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
            }
        });

        builtins.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["ssm:GetParameter", "ssm:GetParameters"],
            resources: ["arn:aws:ssm:*:*:parameter/data-channels*"]
        }));

        builtins.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "elasticfilesystem:ClientMount",
                "elasticfilesystem:ClientRootAccess",
                "elasticfilesystem:ClientWrite",
                "elasticfilesystem:DescribeMountTargets"
            ],
            resources: [accessPoint.accessPointArn]
        }));

        if (snsPublish) {
            builtins.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["SNS:Publish"],
                resources: ["*"]
            }));
        }

        if (sesSend) {
            builtins.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["SES:SendEmail", "SES:SendRawEmail"],
                resources: ["*"]
            }));
        }

        if (athenaGlue) {
            builtins.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "s3:GetBucketLocation",
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts"
                ],
                resources: ["arn:aws:s3:::data-channels-work-*"]
            }));

            builtins.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["s3:*"],
                resources: ["arn:aws:s3:::data-channels-work-*/workspace/*"]
            }));

            builtins.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["athena:StartQueryExecution", "athena:GetQueryExecution"],
                resources: [`arn:aws:athena:*:*:workgroup/${athenaWorkGroup}`]
            }));

            builtins.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
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

            builtins.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["iam:PassRole"],
                resources: ["arn:aws:iam::*:role/*data-channel*"]
            }));
        }

        new cdk.CfnOutput(this, 'lambda-ARN', { value: builtins.functionArn });
    }
}

const app = new cdk.App();

const coreStack = new BuiltinsLambdaStack(app, 'ss-dc-Builtins-stack', {
    stackName,
    env: {
        region: process.env.CDK_DEFAULT_REGION,
        account: process.env.CDK_DEFAULT_ACCOUNT,
    }
});

tagAppStack(coreStack);
