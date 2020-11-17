import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";

/**
 * The stack that defines the application pipeline
 */
export class BuiltinsLambdaPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const pipeline = new CdkPipeline(this, 'Pipeline', {
            // The pipeline name
            pipelineName: 'ss-data-channels-builtins-pipeline',
            cloudAssemblyArtifact,

            // Where the source can be found
            sourceAction: new codepipeline_actions.GitHubSourceAction({
            actionName: 'GitHub',
            output: sourceArtifact,
            oauthToken: SecretValue.secretsManager('ss-data-channels-pipeline-github-token'),
            owner: 'Hobsons',
            repo: 'data-channels-processors',
            trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
            branch: 'DCHAN-398'
        }),

        // How it will be built and synthesized
        synthAction: SimpleSynthAction.standardNpmSynth({
            sourceArtifact,
            cloudAssemblyArtifact,
            installCommand: 'npm run pipeline:install',
            buildCommand: 'npm run build-and-pack',
            environmentVariables: {
                NODE_CONFIG_ENV: {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: 'platsandbox1'
                },
                'NPM_USER': {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: 'hpt-npm-user-ro'
                },
                'NPM_PASS': {
                    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
                    value: '/data-channels/artifactoryPass'
                },
                'NPM_EMAIL': {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: 'dl-devops-all@hobsons.com'
                },
                'NPM_REGISTRY': {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: 'https://hobsons.jfrog.io/hobsons/api/npm/hobsons-platform-team/'
                }
            }
        }),
    });

    // This is where we add the application stages
    // ...
  }
}