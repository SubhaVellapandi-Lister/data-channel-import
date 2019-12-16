import {ConfigType, IChannelConfigCreate, IIngressConfigCreate, ServiceInterfacer} from "@data-channels/dcSDK";
import spin from "./utils/spinner";

export async function findconfigs(top: number , skip: number, filter: string) {
    spin.text = 'Finding Configs';
    spin.start();
    const configs = await ServiceInterfacer.getInstance().findConfigs(filter, top, skip);
    spin.stop();

    return configs;
}

export async function findconfig(guid: string) {
    spin.text = 'Finding Config';
    spin.start();
    const config = await ServiceInterfacer.getInstance().getConfig(guid);
    spin.stop();

    return config;
}

export async function createconfig(createBody: string, configType: ConfigType) {
    spin.text = 'Creating Config';
    spin.start();
    const createBodyObj = JSON.parse(createBody);
    createBodyObj.configType = configType;
    const config = await ServiceInterfacer.getInstance().newConfig(createBodyObj);
    spin.stop();

    return config;
}

export async function updateconfig(configGuid: string, updateBody: string, configType: ConfigType) {
    spin.text = 'Updating Config';
    spin.start();
    const updateBodyObj = JSON.parse(updateBody);
    updateBodyObj.configType = configType;
    const config = await ServiceInterfacer.getInstance().updateConfig(configGuid, updateBodyObj);
    spin.stop();

    return config;
}

export async function deleteconfig(guid: string, hard: boolean) {
    spin.text = 'Deleting Config';
    spin.start();
    const config = await ServiceInterfacer.getInstance().deleteConfig(guid, hard);
    spin.stop();

    return config;
}
