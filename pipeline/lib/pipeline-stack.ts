import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import build = require('@aws-cdk/aws-codebuild');
import pipeline = require('@aws-cdk/aws-codepipeline');
import actions = require('@aws-cdk/aws-codepipeline-actions');
import cfn = require('@aws-cdk/aws-cloudformation');

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const deploymentsBucket = s3.Bucket.fromBucketAttributes(this, 'ImportedBucket', {
            bucketArn: 'arn:aws:s3:::data-channels-processor-deployments-dev'
        });

        /* build.Project(this, 'SomeProject', {
            source: {
            }
        }) */

        const buildProject = new build.PipelineProject(this, 'BuildProject', {
            projectName: 'ss-data-channels-naviance-course-export',
            description: 'Build project for data-channels-naviance-course-export',
            environment: {
                buildImage: build.LinuxBuildImage.STANDARD_3_0,
            },
            environmentVariables: {
                'BUILD_ARTIFACT_BUCKET': {
                    type: build.BuildEnvironmentVariableType.PLAINTEXT,
                    value: deploymentsBucket.bucketName
                },
                'NPM_USER': {
                    type: build.BuildEnvironmentVariableType.PLAINTEXT,
                    value: 'hpt-npm-user-ro'
                },

            },
            cache: build.Cache.bucket(deploymentsBucket, { prefix: 'ss-data-channels-naviance-course-export-codebuild-cache'}),
            buildSpec: build.BuildSpec.fromObject({
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
                            'echo "--------PREBUILD PHASE--------"',
                            'cd naviance/course-planner-export',
                            'npm-cli-login',
                            'npm install',
                        ]
                    },
                    'build': {
                        'commands': [
                            'echo "--------BUILD PHASE--------"',
                            'echo "Starting SAM packaging `date` in `pwd`"',
                            'npm run build',
                            'npm run pack',
                            'sam package --template-file sam-template.yml --output-template-file packaged.yml --s3-bucket $BUILD_ARTIFACT_BUCKET'
                        ]
                    },
                    'post_build': {
                        'commands': [
                            'echo "--------POST-BUILD PHASE--------"',
                            'echo "SAM packaging completed on `date`"',
                        ]
                    }
                },
                'artifacts': {
                    'files': ['packaged.yaml'],
                    'base-directory': 'naviance/course-planner-export'
                },
                'cache': {
                    'paths': ['/root/.cache/pip'],
                }
            })
        });


        /* buildProject.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:ListBucket"],
            resources: [`arn:aws:s3:::${props.readyBucketName}`]
        }));

        buildProject.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            resources: [`arn:aws:s3:::${props.readyBucketName}/*`]
        })); */

        const sourceOutput = new pipeline.Artifact();
        const buildOutput = new pipeline.Artifact();
       // const cfnOutput = new pipeline.Artifact();

        const githubToken = cdk.SecretValue.secretsManager('ss-data-channels-processor-pipeline-github-token', {jsonField: 'github-token'});

        new pipeline.Pipeline(this, 'Pipeline', {
            artifactBucket: deploymentsBucket,
            pipelineName: 'ss-data-channels-naviance-course-export',
            restartExecutionOnUpdate: true,
            stages: [
              {
                stageName: 'Source',
                actions: [
                  new actions.GitHubSourceAction({
                    actionName: 'GitHub_Source',
                    owner: 'Hobsons',
                    repo: 'data-channels-processors',
                    oauthToken: githubToken,
                    output: sourceOutput,
                    branch: 'master',
                    trigger: actions.GitHubTrigger.WEBHOOK
                  }),
                ],
              },
              {
                stageName: 'Build',
                actions: [
                  new actions.CodeBuildAction({
                    actionName: 'Lambda_Build',
                    project: buildProject,
                    input: sourceOutput,
                    outputs: [buildOutput],
                  }),
                ],
              },
              {
                stageName: 'Deploy',
                actions: [
                  new actions.CloudFormationCreateUpdateStackAction({
                    actionName: 'Lambda_CFN_Deploy',
                    templatePath: buildOutput.atPath('packaged.yaml'),
                    stackName: 'ss-data-channels-naviance-course-export-stack',
                    adminPermissions: true,
                    capabilities: [
                      cfn.CloudFormationCapabilities.AUTO_EXPAND,
                      cfn.CloudFormationCapabilities.NAMED_IAM,
                      cfn.CloudFormationCapabilities.ANONYMOUS_IAM,
                    ],
                  }),
                ],
              },
            ],
          });


        //  NOTE: This Stage/Action requires a manual OAuth handshake in the browser be complete before automated deployment can occur
        //  Create a new Pipeline in the console, manually authorize GitHub as a source, and then cancel the pipeline wizard.
           /* stage_name='Source', actions=[
            actions.GitHubSourceAction(
                action_name='SourceCodeRepo',
                owner=github_user,
                oauth_token=github_token,
                repo=github_repo,
                branch='master',
                output=source_output,

            )
        ])*/
        /*serverless_pipeline.add_stage(stage_name='Build', actions=[
            actions.CodeBuildAction(
                action_name='CodeBuildProject',
                input=source_output,
                outputs=[build_output],
                project=build_project,
                type=actions.CodeBuildActionType.BUILD,
                path
            )
        ])
        serverless_pipeline.add_stage(stage_name='Staging', actions=[
            actions.CloudFormationCreateReplaceChangeSetAction(
                action_name='CreateChangeSet',
                admin_permissions=True,
                change_set_name='serverless-pipeline-changeset-Staging',
                stack_name='ServerlessPipelineStaging',
                template_path=pipeline.ArtifactPath(
                    build_output,
                    file_name='packaged.yaml'
                ),
                capabilities=[cfn.CloudFormationCapabilities.ANONYMOUS_IAM],
                run_order=1,
            ),
            actions.CloudFormationExecuteChangeSetAction(
                action_name='ExecuteChangeSet',
                change_set_name='serverless-pipeline-changeset-Staging',
                stack_name='ServerlessPipelineStaging',
                output=cfn_output,
                run_order=2,
            ),
        ])

        serverless_pipeline.add_stage(stage_name='Production', actions=[
            actions.CloudFormationCreateReplaceChangeSetAction(
                action_name='CreateChangeSet',
                admin_permissions=True,
                change_set_name='serverless-pipeline-changeset-Production',
                stack_name='ServerlessPipelineProduction',
                template_path=pipeline.ArtifactPath(
                    build_output,
                    file_name='packaged.yaml'
                ),
                capabilities=[cfn.CloudFormationCapabilities.ANONYMOUS_IAM],
                run_order=1,
            ),
            actions.ManualApprovalAction(
                action_name='DeploymentApproval',
                notify_emails=[notification_email],
                run_order=2,
            ),
            actions.CloudFormationExecuteChangeSetAction(
                action_name='ExecuteChangeSet',
                change_set_name='serverless-pipeline-changeset-Production',
                stack_name='ServerlessPipelineProduction',
                output=cfn_output,
                run_order=3,
            ),
        ]) */

       /*  core.CfnOutput(
            self, 'BuildArtifactsBucketOutput',
            value=artifact_bucket.bucket_name,
            description='Amazon S3 Bucket for Pipeline and Build artifacts',
        )
        core.CfnOutput(
            self, 'CodeBuildProjectOutput',
            value=build_project.project_arn,
            description='CodeBuild Project name',
        )
        core.CfnOutput(
            self, 'CodePipelineOutput',
            value=serverless_pipeline.pipeline_arn,
            description='AWS CodePipeline pipeline name',
        ) */
    }
}
