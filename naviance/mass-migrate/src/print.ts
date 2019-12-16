#!/usr/bin/env node

import { ITenantUser } from '@data-channels/dcSDK';
import Table from 'cli-table3';

export function printIngressConfig(config: any) {
    const infoTable = new Table({style: {head: ['green']}, head: ['Config Info', 'Ingress Details']});
    const infoItems = [
        { "config guid": config.guid },
        { "config details guid": config.detailsGuid},
        { name: config.name },
        { author: config.author },
        { product: config.product },
        { configType : config.configType },
        { isLatest: config.isLatest },
        { isDeleted: config.isDeleted },
        { created: config.created },
        { replaced: config.replaced },
        { tenant: JSON.stringify(config.tenant) },
        { parent: JSON.stringify(config.parent) },
        { meta: JSON.stringify(config.meta) },
        { jobs: JSON.stringify(config.jobs) },
        { rateLimit: JSON.stringify(config.rateLimit) }
    ];
    // @ts-ignore
    infoTable.push(...infoItems);
    console.log(infoTable.toString());
}

export function printChannelConfig(config: any) {
    const infoTable = new Table({style: {head: ['green']}, head: ['Config Info', 'Channel Details']});
    const infoItems = [
        { "config guid": config.guid },
        { "config details guid": config.detailsGuid},
        { name: config.name },
        { product: config.product },
        { author: config.author },
        { configType : config.configType },
        { isLatest: config.isLatest },
        { isDeleted: config.isDeleted },
        { created: config.created },
        { replaced: config.replaced },
        { tenant: JSON.stringify(config.tenant) },
        { parent: JSON.stringify(config.parent) },
        { meta: JSON.stringify(config.meta) },
        { inheritOnly: config.inheritOnly },
        { flow: JSON.stringify(config.flow) },
        { steps: JSON.stringify(config.steps) },
    ];
    // @ts-ignore
    infoTable.push(...infoItems);
    console.log(infoTable.toString());
}

export function printJob(job: any) {
    const infoTable = new Table({style: {head: ['green']}, head: ['Job Info', 'Details']});
    const optionalFields = [
        'batch', 'ingress', 'tenant', 'queueName', 'statusMessage',
        'isDeleted', 'meta', 'workspace', 'filesIn', 'filesOut'
    ];
    let infoItems = [
        { "job guid": job.guid },
        { name: job.name },
        { batch: job.batch },
        { channel: JSON.stringify(job.channel, undefined, 2) },
        { ingress : JSON.stringify(job.ingress, undefined, 2) },
        { tenant: JSON.stringify(job.tenant, undefined, 2) },
        { product: job.product },
        { queueName: job.queueName },
        { author: job.author },
        { status: job.status },
        { statusMessage: job.statusMsg },
        { created: job.created },
        { started: job.started },
        { completed: job.completed },
        { isDeleted: job.isDeleted },
        { meta: JSON.stringify(job.meta, undefined, 2) },
        { workspace: JSON.stringify(job.workspace, undefined, 2) },
        { currentStep: job.currentStep },
        { filesIn: JSON.stringify(job.filesIn, undefined, 2) },
        { filesOut: JSON.stringify(job.filesOut, undefined, 2) },
    ];
    infoItems = infoItems.filter((item) =>
        !optionalFields.includes(Object.keys(item)[0]) ||
        (Object.values(item)[0] && Object.values(item)[0] !== '[]' && Object.values(item)[0] !== 'null'));

    // @ts-ignore
    infoTable.push(...infoItems);
    console.log(infoTable.toString());

    for (const stepName of Object.keys(job.steps)) {
        printJobStep(stepName, job.steps[stepName]);
    }
}

export function printJobStep(name: string, step: any) {
    const infoTable = new Table({style: {head: ['green']}, head: [`Step ${name}`, 'Details']});
    const optionalFields = ['parameters', 'output', 'metrics'];
    let infoItems = [
        { finished: step.finished },
        { parameters: JSON.stringify(step.parameters, undefined, 2) },
        { output: JSON.stringify(step.output, undefined, 2) },
        { metrics: JSON.stringify(step.metrics, undefined, 2) }
    ];
    infoItems = infoItems.filter((item) =>
        !optionalFields.includes(Object.keys(item)[0]) || Object.values(item)[0]);
    // @ts-ignore
    infoTable.push(...infoItems);
    console.log(infoTable.toString());
}

export function printTenant(tenant: any) {
    const infoTable = new Table({style: {head: ['green']}, head: ['Tenant Info', 'Details']});
    const infoItems = [
        { "tenant guid": tenant.guid },
        { name: tenant.name },
        { product: tenant.product },
        { created: tenant.created },
        { isDeleted: tenant.isDeleted },
        { hiid: tenant.hiid },
        { meta: JSON.stringify(tenant.meta) },
        { updated: tenant.updated },
        { users: tenant.users.map((tuser: any) => tuser.username).join(', ') }
    ];
    // @ts-ignore
    infoTable.push(...infoItems);
    console.log(infoTable.toString());
}

export function printTenantsList(tenants: any) {
    const infoTable = new Table({style: {head: ['green']}, head: ['Product', 'Name', 'Guid', 'User Count']});
    const infoItems = [];
    for (const t of tenants) {
        infoItems.push([t.product, t.name, t.guid, t.users.length.toString()]);
    }
    // @ts-ignore
    infoTable.push(...infoItems);
    console.log(infoTable.toString());
}

export function printTenantUser(tenantUser: ITenantUser) {
    const infoTable = new Table({style: {head: ['green']}, head: ['Tenant User Info', 'Details']});
    const infoItems = [
        { "tenant user guid": tenantUser.guid },
        { username: tenantUser.username },
        { email: tenantUser.email },
        { sftpServerId: tenantUser.sftpServerId },
        { sftpHomeDirectory: tenantUser.sftpHomeDirectory },
        { sftpLastLogin: tenantUser.sftpLastLogin },
        { sftpPasswordRotate: tenantUser.sftpPasswordRotate },
        { meta: JSON.stringify(tenantUser.meta, undefined, 2) },
        { tenant: JSON.stringify(tenantUser.tenant, undefined, 2) }
    ];
    // @ts-ignore
    infoTable.push(...infoItems);
    console.log(infoTable.toString());
}

export function printTenantUsersList(tenantUsers: ITenantUser[]) {
    const infoTable = new Table({
        style: {head: ['green']}, head: ['Username', 'Email', 'ServerId', 'Home Directory', 'Guid', 'Last Login']});
    const infoItems = [];
    for (const u of tenantUsers) {
        infoItems.push([u.username, u.email, u.sftpServerId, u.sftpHomeDirectory, u.guid, u.sftpLastLogin]);
    }
    // @ts-ignore
    infoTable.push(...infoItems);
    console.log(infoTable.toString());
}
