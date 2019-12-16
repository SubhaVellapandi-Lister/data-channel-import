import {
    IConfigReference,
    IFileDetails,
    IJobCreate,
    IJobParameters,
    IJobUpdate,
    ITenantReference,
    ServiceInterfacer
} from "@data-channels/dcSDK";
import spin from "./utils/spinner";

export async function findjobs(top: number , skip: number, filter: string) {
    spin.text = 'Finding Jobs';
    spin.start();
    const jobs = await ServiceInterfacer.getInstance().findJobs(filter, top, skip);
    spin.stop();

    return jobs;
}

export async function findjob(guid: string) {
    spin.text = 'Finding Job';
    spin.start();
    const job = await ServiceInterfacer.getInstance().getJob(guid);
    spin.stop();

    return job;
}

export async function createjob(createBody: string, execute: boolean) {
    spin.text = 'Creating Job';
    spin.start();
    let job;
    const newJob: IJobCreate = JSON.parse(createBody);

    job = await ServiceInterfacer.getInstance().newJob(newJob, execute);
    spin.stop();

    return job;
}

export async function updatejob(jobGuid: string, updateBody: string) {
    spin.text = 'Updating Job';
    spin.start();
    let job;
    const updateJob: IJobUpdate = JSON.parse(updateBody);
    job = await ServiceInterfacer.getInstance().updateJob(jobGuid, updateJob);

    spin.stop();

    return job;
}

export async function deletejob(guid: string, hard: boolean) {
    spin.text = 'Deleting Job';
    spin.start();
    const job = await ServiceInterfacer.getInstance().deleteJob(guid, hard);
    spin.stop();

    return job;
}

export function jobExecutionBody(cmd: any): IJobCreate {
    const channelParts = cmd.channel.split('/');
    const channel: IConfigReference = {};
    if (channelParts.length === 1) {
        channel.guid = channelParts[0];
    } else {
        channel.product = channelParts[0];
        channel.name = channelParts[1];
    }
    const product = cmd.product || channel.product || 'unknown';
    const tenant: ITenantReference = {};
    if (cmd.tenant) {
        const tenantParts = cmd.tenant.split('/');
        if (tenantParts.length === 1) {
            tenant.guid = tenantParts[0];
        } else {
            tenant.product = tenantParts[0];
            tenant.name = tenantParts[1];
        }
    }

    function fileInfoParse(info: string): IFileDetails {
        const [name, location] = info.split('=');
        const locationParts = location.split('/');

        return {
            name,
            s3: {
                bucket: locationParts[0],
                key: locationParts.slice(1).join('/')
            }
        };
    }

    const filesIn: IFileDetails[] = cmd.filesIn ? cmd.filesIn.split(',').map(fileInfoParse) : [];
    const filesOut: IFileDetails[] = cmd.filesOut ? cmd.filesOut.split(',').map(fileInfoParse) : [];

    let parameters: IJobParameters = {};
    if (cmd.parameters) {
        try {
            // first just see if whole thing is one json blob
            parameters = JSON.parse(cmd.parameters);
        } catch {
            const paramList = cmd.parameters.split(',');
            for (const paramTuple of paramList) {
                // tslint:disable-next-line
                let [name, value] = paramTuple.split('=');
                try {
                    value = JSON.parse(value);
                } catch {
                    // value must just be a string
                }
                let stepName = '';
                if (name.includes(':')) {
                    [stepName, name] = name.split(':');
                }
                if (stepName) {
                    parameters.steps = parameters.steps || {};
                    parameters.steps[stepName] = {...parameters.steps[stepName], ...{[name]: value}};
                } else {
                    parameters.all = {...parameters.all, ...{[name]: value}};
                }
            }
        }
    }

    const createBody: IJobCreate = {
        name: cmd.jobName ? cmd.jobName  : `${product}-${channel.name || channel.guid}-cli-execute`,
        product,
        author: cmd.author,
        channel,
        filesIn,
        filesOut,
        parameters
    };

    if (Object.keys(tenant).length) {
        createBody.tenant = tenant;
    }

    return createBody;
}
