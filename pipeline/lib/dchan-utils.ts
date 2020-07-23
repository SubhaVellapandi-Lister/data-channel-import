import cdk = require('@aws-cdk/core');
import build = require('@aws-cdk/aws-codebuild');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import { IArtifacts } from '@aws-cdk/aws-codebuild';

export function devDeploymentsBucket(stack: cdk.Stack, id: string = 'ImportedBucket') {
    return s3.Bucket.fromBucketAttributes(stack, id, {
        bucketArn: 'arn:aws:s3:::data-channels-processor-deployments-dev'
    });
}

export const filterGroupMasterPush = build.FilterGroup.inEventOf(build.EventAction.PUSH).andBranchIs('master');
export const filterGroupPullCreate = build.FilterGroup.inEventOf(build.EventAction.PULL_REQUEST_CREATED);
export const filterGroupPullUpdate = build.FilterGroup.inEventOf(build.EventAction.PULL_REQUEST_UPDATED);

export function buildProject(
    stack: cdk.Stack,
    projectName: string,
    description: string,
    repoOwner: string,
    repoName: string,
    buildCommands: string[],
    webhookFilters: build.FilterGroup[],
    artifacts?: IArtifacts,
    buildSpecArtifacts?: object
): build.Project {

    const bucket = devDeploymentsBucket(stack, `ImportedBucket-${projectName}`);
    const project = new build.Project(stack, projectName, {
        projectName,
        description,
        source: build.Source.gitHub({
            owner: repoOwner,
            repo: repoName,
            webhook: true,
            webhookFilters
        }),
        environment: {
            buildImage: build.LinuxBuildImage.STANDARD_3_0
        },
        environmentVariables: envVars(bucket.bucketName),
        cache: build.Cache.bucket(bucket, { prefix: `${projectName}-codebuild-cache`}),
        buildSpec: buildSpec(buildCommands, buildSpecArtifacts),
        artifacts
    });

    project.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: [`arn:aws:ssm:*:*:parameter/data-channels/artifactoryPass`]
    }));

    return project;
}

export function buildSpec(buildCommands: string[], artifacts?: object): build.BuildSpec {
    const specObject: any = {
        'version': '0.2',
        'phases': {
            'install': {
                'runtime-versions': {
                    'nodejs': 12,
                },
                'commands': [
                    'echo "--------INSTALL PHASE--------"',
                    'pip3 install aws-sam-cli',
                    'npm install -g npm-cli-login',
                ]
            },
            'pre_build': {
                'commands': [
                    'echo "--------NPM LOGIN--------"',
                    'npm-cli-login -s @data-channels',
                    'npm-cli-login -s @academic-planner',
                    `sed -i 's/team\\/\\//team\\//g' ~/.npmrc`,
                ]
            },
            'build': {
                'commands': buildCommands
            },
            'post_build': {
                'commands': [
                    'echo "--------POST-BUILD PHASE--------"',
                    'echo "Build completed on `date`"',
                ]
            }
        },
        'cache': {
            'paths': ['/root/.cache/pip'],
        }
    };

    if (artifacts) {
        specObject['artifacts'] = artifacts;
    }

    return build.BuildSpec.fromObject(specObject);
}

export function envVars(artifactBucketName?: string): { [name: string]: build.BuildEnvironmentVariable }  {
    return {
        'BUILD_ARTIFACT_BUCKET': {
            type: build.BuildEnvironmentVariableType.PLAINTEXT,
            value: artifactBucketName
        },
        'NPM_USER': {
            type: build.BuildEnvironmentVariableType.PLAINTEXT,
            value: 'hpt-npm-user-ro'
        },
        'NPM_PASS': {
            type: build.BuildEnvironmentVariableType.PARAMETER_STORE,
            value: '/data-channels/artifactoryPass'
        },
        'NPM_EMAIL': {
            type: build.BuildEnvironmentVariableType.PLAINTEXT,
            value: 'dl-devops-all@hobsons.com'
        },
        'NPM_REGISTRY': {
            type: build.BuildEnvironmentVariableType.PLAINTEXT,
            value: 'https://hobsons.jfrog.io/hobsons/api/npm/hobsons-platform-team/'
        }
    }
}