import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');
import config from "config";

import { tagAppStack } from "./permBoundary";
import { synthesizer } from "./synthesizer";


/* const app = new cdk.App();

const coreStack = new BuiltinsLambdaStack(app, 'ss-dc-Builtins-stack', {
    synthesizer,
    stackName,
    env: {
        region: process.env.CDK_DEFAULT_REGION,
        account: process.env.CDK_DEFAULT_ACCOUNT,
    }
});

tagAppStack(coreStack); */

import { App } from '@aws-cdk/core';
import { BuiltinsLambdaPipelineStack } from './pipeline';

const app = new App();

new BuiltinsLambdaPipelineStack(app, 'ss-data-channels-builtins-pipeline', {
    synthesizer,
    env: {
        region: process.env.CDK_DEFAULT_REGION,
        account: process.env.CDK_DEFAULT_ACCOUNT,
    }
});

app.synth();