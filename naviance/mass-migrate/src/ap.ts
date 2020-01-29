import { existsSync, mkdirSync, readFileSync, writeFileSync  } from 'fs';
import { homedir } from 'os';
import request from "request-promise-native";

const configFilePath = `${homedir()}/.academic-planner/cli.json`;

function loadLocalConfig(): object {
    let configInfo = {};
    if (existsSync(configFilePath)) {
        configInfo = JSON.parse(readFileSync(configFilePath, 'utf8'));
    }

    return configInfo;
}

async function auth0JWT(): Promise<string> {
    const prodInfo = loadLocalConfig()['prod']['auth0'];

    const options = {
        method: 'POST',
        url: `https://${prodInfo.domain}/oauth/token`,
        headers: { 'content-type': 'application/json' },
        json: true,
        body: {
            client_id: prodInfo.clientId,
            client_secret: prodInfo.clientSecret,
            audience: prodInfo.audience,
            grant_type: "client_credentials"
        }
    };
    const auth0Response = await request(options);

    return auth0Response['access_token'];
}

const URLS = {
    repoHost: 'https://api2-ada.hobsonshighered.com/aplan-repository',
    engineHost: 'https://api2-ada.hobsonshighered.com/aplan-planning'
};

export async function getApInfo(): Promise<object[]> {
    const jwt = await auth0JWT();

    const nsOptions = {
        method: 'GET',
        url: `${URLS.repoHost}/namespaces`,
        headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${jwt}`
        },
        json: true
    };

    const nsResponse = await request(nsOptions);

    const scopeOptions = {
        method: 'GET',
        url: `${URLS.engineHost}/scopes`,
        headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${jwt}`
        },
        json: true
    };

    const scopeResponse = await request(scopeOptions);

    return [nsResponse, scopeResponse];
}
