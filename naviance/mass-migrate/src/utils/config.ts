import {
    ServiceInterfacer
} from "@data-channels/dcSDK";

import { CommanderStatic } from 'commander';
import { existsSync, mkdirSync, readFileSync, writeFileSync  } from 'fs';
import { homedir } from 'os';

const INITIAL_DEFAULT_ENVIRO_NAME = 'local';

export const ENVIROS = {
    local: {
        host: 'http://localhost:8098'
    },
    sandbox: {
        host: 'https://turbo-api.hobsonshighered.com/data-channels-sandbox/'
    },
    dev: {
        host: 'https://turbo-api.hobsonshighered.com/data-channels-dev/'
    },
    qa: {
        host: ''
    },
    demo: {
        host: ''
    },
    rc: {
        host: ''
    },
    navprod: {
        host: 'https://api2-ada.hobsonshighered.com/data-channels-navprod/'
    }
};

const configFilePath = `${homedir()}/.data-channels/cli.json`;

function loadLocalConfig(): object {
    let configInfo = {};
    if (existsSync(configFilePath)) {
        configInfo = JSON.parse(readFileSync(configFilePath, 'utf8'));
    }

    return configInfo;
}

function saveLocalConfig() {
    if (!existsSync(`${homedir()}/.data-channels`)) {
        mkdirSync(`${homedir()}/.data-channels`);
    }
    writeFileSync(configFilePath, JSON.stringify(localConfig), 'utf8');
}

export const localConfig = loadLocalConfig();

export function setDefaultEnviro(enviroName: string) {
    for (const ev of Object.keys(localConfig)) {
        localConfig[ev]['default'] = false;
    }
    if (!localConfig[enviroName]) {
        localConfig[enviroName] = { default: true, jwt: '' };
    } else {
        localConfig[enviroName]['default'] = true;
    }
    saveLocalConfig();
}

export function setJWT(enviroName: string, jwt: string) {
    if (!localConfig[enviroName]) {
        localConfig[enviroName] = { default: false, jwt };
    } else {
        localConfig[enviroName]['jwt'] = jwt;
    }
    saveLocalConfig();
}

export function setAuth0(
    enviroName: string, clientId: string, clientSecret: string, domain: string, audience: string
) {
    const auth0 = {
        clientId,
        clientSecret,
        domain,
        audience
    };

    if (!localConfig[enviroName]) {
        localConfig[enviroName] = { default: false, auth0 };
    } else {
        localConfig[enviroName]['auth0'] = auth0;
    }
    saveLocalConfig();

}

export function connectionDetails(program: CommanderStatic) {
    let enviroName = INITIAL_DEFAULT_ENVIRO_NAME;
    if (program.enviro) {
        enviroName = program.enviro;
    } else {
        for (const ev of Object.keys(localConfig)) {
            if (localConfig[ev]['default']) {
                enviroName = ev;
            }
        }
    }

    if (!ENVIROS[enviroName]) {
        console.log(`environment ${enviroName} not found`);
        process.exit(1);
    }

    if (program.auth0ClientId) {
        setAuth0(
            enviroName,
            program.auth0ClientId,
            program.auth0ClientSecret,
            program.auth0Domain,
            program.auth0Audience
        );
    } else if (program.jwt) {
        setJWT(enviroName, program.jwt);
    }

    const conf = localConfig[enviroName];

    let jwt = '';
    if (!conf) {
        jwt = process.env.APSDK_JWT || '';
    } else if (!conf['auth0']) {
        jwt = localConfig[enviroName].jwt || process.env.APSDK_JWT || '';
    }

    const details = {
        jwt,
        url: program.dataChannels || ENVIROS[enviroName]['host']
    };

    if (conf && conf['auth0']) {
        details['auth0'] = conf['auth0'];
    }

    return details;
}

export function initConnection(program: CommanderStatic) {
    const details = connectionDetails(program);

    const conf = {
        url: details.url,
        jwt: details.jwt
    };

    if (details['auth0']) {
        conf['auth0'] = details['auth0'];
    }

    ServiceInterfacer.init(conf);
}

export function getDefaultEnviro(): string {
    for (const ev of Object.keys(localConfig)) {
        if (localConfig[ev]['default']) {
            return ev;
        }
    }

    return INITIAL_DEFAULT_ENVIRO_NAME;
}
