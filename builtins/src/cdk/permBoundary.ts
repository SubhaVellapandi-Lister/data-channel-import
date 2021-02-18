import iam = require('@aws-cdk/aws-iam');
import { Aspects } from '@aws-cdk/core';
import cdk = require('@aws-cdk/core');
import config from "config";

export class PermissionsBoundary implements cdk.IAspect {
  private readonly permissionsBoundaryArn: string;

  constructor(permissionBoundaryArn: string) {
      this.permissionsBoundaryArn = permissionBoundaryArn;
  }

  public visit(node: cdk.IConstruct): void {
      if (node instanceof iam.Role) {
          const roleResource = node.node.findChild('Resource') as iam.CfnRole;
          roleResource.addPropertyOverride('PermissionsBoundary', this.permissionsBoundaryArn);
      }
  }
}

export function tagAppStack(appStack: cdk.Stack): void {
    const environment = config.get<string>('cdk.environment');
    const productLine = config.get<string>('cdk.productLine');
    const productComponent = config.get<string>('cdk.productComponent');
    const permissionBoundary = config.get<string>('cdk.permissionBoundary');

    if (permissionBoundary) {
        const permissionBoundaryArn = permissionBoundary.startsWith('arn') ?
            permissionBoundary : `arn:aws:iam::${process.env.CDK_DEFAULT_ACCOUNT}:policy/${permissionBoundary}`;
        Aspects.of(appStack).add(new PermissionsBoundary(permissionBoundaryArn));
    }

    cdk.Tags.of(appStack).add('ProductLine', `${productLine}`);
    cdk.Tags.of(appStack).add('ProductComponent', `${productComponent}`);
    cdk.Tags.of(appStack).add('EnvType', `${environment}`);
    cdk.Tags.of(appStack).add('Provisioner', 'aws-cdk');
}
