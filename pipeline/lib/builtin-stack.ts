import cdk = require('@aws-cdk/core');
import build = require('@aws-cdk/aws-codebuild');
import {
    buildProject,
    devDeploymentsBucket,
    filterGroupPullCreate,
    filterGroupPullUpdate,
    filterGroupMasterPush
} from "./dchan-utils";

export class DchanBuiltinStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const prCommands = [
            'echo "--------BUILD PHASE--------"',
            'cd builtins',
            'npm install',
            'npm run build',
            'npm run test',
            'cd ../naviance/course-planner-export',
            'npm install',
            'npm run build',
            'npm run test',
            'cd ../course-planner-import',
            'npm install',
            'npm run build',
            'npm run test',
        ];

        const prBuild = buildProject(
            this,
            'ss-dchan-builtin-pr-project',
            'Data channels builtin PR project CI',
            'Hobsons',
            'data-channels-processors',
            prCommands,
            [
                filterGroupPullCreate,
                filterGroupPullUpdate
            ]
        );

        const mergeCommands = [
            'cd builtins',
            'npm install',
            'npm run test',
            'sam package --output-template-file packaged-dev.yml --s3-bucket $BUILD_ARTIFACT_BUCKET'
        ]

        const artifactsBucket = build.Artifacts.s3({
            bucket: devDeploymentsBucket(this, 'BuiltinsImportedBucket'),
            path: 'builtins/merge/artifacts/',
            name: 'results.zip',
            packageZip: true
        });

        const mergeBuild = buildProject(
            this,
            'ss-dchan-builtin-merge-project',
            'Data channels builtin merge project CI',
            'Hobsons',
            'data-channels-processors',
            mergeCommands,
            [
                filterGroupMasterPush.andFilePathIs('^builtins.*')
            ],
            artifactsBucket,
            {
                'files': ['packaged-dev.yml'],
                'base-directory': 'builtins'
            }
        )
    }
}
