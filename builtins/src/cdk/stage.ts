import config from "config";
import { CfnOutput, Construct, Stage, StageProps } from '@aws-cdk/core';
import { BuiltinsLambdaStack } from './stack';
import { synthesizer } from "./synthesizer";
import { tagAppStack } from "./permBoundary";

const environment = config.get<string>('cdk.environment');
let stackName = config.get<string>('cdk.stackName');

if (stackName.includes('${environment}')) {
    stackName = stackName.replace('${environment}', environment);
}

/**
 * Deployable unit of web service app
 */
export class BuiltinsLambdaStage extends Stage {
  //public readonly urlOutput: CfnOutput;

    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

        const lambdaStack = new BuiltinsLambdaStack(this, 'WebService', {
            synthesizer,
            stackName,
        });

        tagAppStack(lambdaStack);

        // Expose CdkpipelinesDemoStack's output one level higher
        // this.urlOutput = service.urlOutput;
    }
}