import {
    ITenantFindCriteria,
    ITenantUserRotatePassword,
    ServiceInterfacer,
    Tenant,
    TenantOrderBy,
    TenantPager,
    TenantUser,
    TenantUserOrderBy,
    TenantUserPager
} from "@data-channels/dcSDK";
import spin from "./utils/spinner";

export function findTenantsPager(
    name: string, product: string
): TenantPager {
    spin.text = 'Finding Tenants';
    spin.start();
    const findCriteria: ITenantFindCriteria = {};
    if (name) {
        findCriteria['name'] = {
            operator: 'eq',
            value: name
        };
    }
    if (product) {
        findCriteria['product'] = {
            operator: 'eq',
            value: product
        };
    }

    return Tenant.find({
        findCriteria,
        orderBy: 'name'
    });
}

export async function findtenant(guid: string, product?: string, name?: string) {
    spin.text = 'Finding Tenant';
    spin.start();
    let tenant: any;
    if (!guid && product && name) {
        tenant = await findTenantByName(product, name);
    } else {
        tenant = await ServiceInterfacer.getInstance().getTenant(guid);
    }
    spin.stop();

    return tenant;
}

export async function findTenantByName(product: string, name: string): Promise<Tenant | null> {
    const page = Tenant.find({
        findCriteria: {
            name: {
                operator: 'eq',
                value: name
            },
            product: {
                operator: 'eq',
                value: product
            }
        }
    });

    const tenants = await page.all();
    if (tenants.length) {
        return tenants[0];
    }

    return null;
}

export function findTenantUsersPager(
    tenantGuid: string, username?: string, serverId?: string, email?: string
): TenantUserPager {
    spin.text = 'Finding Tenants';
    spin.start();
    const findCriteria: ITenantFindCriteria = {};
    if (username) {
        findCriteria['username'] = {
            operator: 'eq',
            value: username
        };
    }
    if (serverId) {
        findCriteria['serverId'] = {
            operator: 'eq',
            value: serverId
        };
    }
    if (email) {
        findCriteria['email'] = {
            operator: 'eq',
            value: email
        };
    }

    return TenantUser.find(tenantGuid, {
        findCriteria,
        orderBy: 'username'
    });
}

export async function findTenantUsersByCriteria(
    tenantGuid: string, username?: string, serverId?: string, email?: string
): Promise<TenantUser[]> {
    const findCriteria = {};
    if (username) {
        findCriteria['username'] = {
            operator: 'eq',
            value: username
        };
    }
    if (serverId) {
        findCriteria['sftpServerId'] = {
            operator: 'eq',
            value: serverId
        };
    }
    if (email) {
        findCriteria['email'] = {
            operator: 'eq',
            value: email
        };
    }

    const page = TenantUser.find(tenantGuid, {
        findCriteria
    });

    return await page.all();
}

export async function createtenant(createBody: string) {
    spin.text = 'Creating Tenant';
    spin.start();
    const tenant = await ServiceInterfacer.getInstance().newTenant(JSON.parse(createBody));
    spin.stop();

    return tenant;
}

export async function updatetenant(tenantGuid: string, updateBody: string) {
    spin.text = 'Updating Tenant';
    spin.start();
    const tenant = await ServiceInterfacer.getInstance().updateTenant(tenantGuid, JSON.parse(updateBody));
    spin.stop();

    return tenant;
}

export async function deletetenant(guid: string, hard: boolean) {
    spin.text = 'Deleting Tenant User';
    spin.start();
    const tenant = await ServiceInterfacer.getInstance().deleteTenant(guid, hard);
    spin.stop();

    return tenant;
}

export async function findTenantUsers(
    tenantGuid: string, top: number , skip: number, filter: string, orderBy: TenantUserOrderBy
) {
    return await ServiceInterfacer.getInstance().findTenantUsers(tenantGuid, filter, orderBy , top, skip);
}

export async function findTenantUser(
    tenantGuid: string, tenantUserGuid?: string, username?: string, serverId?: string, email?: string
) {
    if (!tenantUserGuid) {
        const users = await findTenantUsersByCriteria(tenantGuid, username, serverId, email);

        return users[0];
    }

    return await ServiceInterfacer.getInstance().getTenantUser(tenantGuid, tenantUserGuid);
}

export async function createTenantUser(tenantGuid: string, createBody: string) {
    return await ServiceInterfacer.getInstance().newTenantUser(tenantGuid, JSON.parse(createBody));
}

export async function updateTenantUser(tenantGuid: string, tenantUserGuid: string, updateBody: string) {
    return await ServiceInterfacer.getInstance().updateTenantUser(tenantGuid, tenantUserGuid, JSON.parse(updateBody));
}

export async function deleteTenantUser(tenantGuid: string, tenantUserGuid: string) {
    return await ServiceInterfacer.getInstance().deleteTenantUser(tenantGuid, tenantUserGuid);
}

export async function rotateUserPassword(
    tenantGuid: string, tenantUserGuid: string
): Promise<ITenantUserRotatePassword> {
    return ServiceInterfacer.getInstance().rotateUserPassword(tenantGuid, tenantUserGuid);
}
