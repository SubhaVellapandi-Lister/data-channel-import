import cdk = require('@aws-cdk/core');
import config from 'config';

const legacySynth = config.get<boolean>('cdk.synthesizer.legacy');

export let synthesizer: cdk.LegacyStackSynthesizer | cdk.DefaultStackSynthesizer = new cdk.LegacyStackSynthesizer();
if (!legacySynth) {
    const rolePrefix = config.get<string>('cdk.synthesizer.rolePrefix');
    synthesizer = new cdk.DefaultStackSynthesizer({
        deployRoleArn: 'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/' + rolePrefix + '${Qualifier}-deploy-role-${AWS::AccountId}-${AWS::Region}',
        fileAssetPublishingRoleArn: 'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/' + rolePrefix + '${Qualifier}-file-publishing-role-${AWS::AccountId}-${AWS::Region}',
        imageAssetPublishingRoleArn: 'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/' + rolePrefix + '${Qualifier}-image-publishing-role-${AWS::AccountId}-${AWS::Region}',
        cloudFormationExecutionRole: 'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/' + rolePrefix + '${Qualifier}-cfn-exec-role-${AWS::AccountId}-${AWS::Region}'
    });
}
