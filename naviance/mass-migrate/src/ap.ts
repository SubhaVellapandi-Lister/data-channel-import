import { existsSync, mkdirSync, readFileSync, writeFileSync  } from 'fs';
import { homedir } from 'os';
import fetch from "node-fetch";

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

    const url = `https://${prodInfo.domain}/oauth/token`
    const auth0Request = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            client_id: prodInfo.clientId,
            client_secret: prodInfo.clientSecret,
            audience: prodInfo.audience,
            grant_type: "client_credentials"
        })
    });

    if(auth0Request.ok) {
        const auth0Response = await auth0Request.json()
        return auth0Response['access_token'];
    }
    
    throw Error('Cannot obtain JWT from Auth0');
}

const URLS = {
    repoHost: 'https://api2-ada.hobsonshighered.com/aplan-repository',
    engineHost: 'https://api2-ada.hobsonshighered.com/aplan-planning'
};

export async function getApInfo(): Promise<object[]> {
    const jwt = await auth0JWT();

   
    const nsUrl = `${URLS.repoHost}/namespaces`
    const nsRequest = await fetch(nsUrl,{
        method: 'GET',
        headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${jwt}`
        },
    });
    const nsResponse = await nsRequest.json()


    const scopeUrl = `${URLS.engineHost}/scopes`
    const scopeRequest = await fetch(scopeUrl, {
        method: 'GET',
        headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${jwt}`
        }
    });
    const scopeResponse = await scopeRequest.json()

    return [nsResponse, scopeResponse];
}
