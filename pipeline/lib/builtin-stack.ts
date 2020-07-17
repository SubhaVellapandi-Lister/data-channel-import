import cdk = require('@aws-cdk/core');
import {
    buildProject,
    filterGroupPullCreate,
    filterGroupPullUpdate
} from "./dchan-utils";

export class DchanBuiltinStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const commands = [
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
            commands,
            [
                filterGroupPullCreate,
                filterGroupPullUpdate
            ]
        );
    }
}
