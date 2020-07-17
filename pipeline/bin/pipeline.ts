#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { DchanStarterStack } from "../lib/starter-stack";
import { DchanBuiltinStack } from '../lib/builtin-stack';
const app = new cdk.App();
new DchanStarterStack(app, 'ss-data-channels-starter');
new DchanBuiltinStack(app, 'ss-data-channels-builtins');