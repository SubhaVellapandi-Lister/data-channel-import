import cdk = require('@aws-cdk/core');
import {
    buildProject,
    filterGroupMasterPush,
    filterGroupPullCreate,
    filterGroupPullUpdate
} from "./dchan-utils";

export class DchanStarterStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const samInitContext = {
            project_name: "testproject",
            function_name: "test-function",
            function_description: "Description of function",
            function_method_name: "testMethod"
        };

        const commands = [
            'echo "--------BUILD PHASE--------"',
            `sam init -l . --no-interactive --no-input --extra-context '${JSON.stringify(samInitContext)}'`,
            'cd testproject',
            'npm run build',
            'npm run test'
        ];

        const starterBuild = buildProject(
            this,
            'ss-starter-project',
            'Data channels starter project CI',
            'Hobsons',
            'data-channels-starter',
            commands,
            [
                filterGroupMasterPush,
                filterGroupPullCreate,
                filterGroupPullUpdate
            ]
        );
    }
}
