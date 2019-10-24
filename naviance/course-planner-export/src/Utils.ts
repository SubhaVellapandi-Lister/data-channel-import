import {
    PlanningEngine, RulesRepository
} from "@academic-planner/apSDK";

export function initServices(parameters: object) {
    const config: any = {
        url: parameters['planningUrl'],
        jwt: parameters['JWT'] || '',
    };
    if (parameters['auth0ClientId']) {
        config.auth0 = {
            clientId: parameters['auth0ClientId'],
            clientSecret: parameters['auth0ClientSecret'],
            domain: parameters['auth0Domain'],
            audience: parameters['auth0Audience']
        };
    }
    PlanningEngine.init(config);
    config.product = 'naviance';
    config.url = parameters['rulesRepoUrl'];
    RulesRepository.init(config);
}

export async function getJWT(): Promise<string> {
    return await RulesRepository.getInstance().getJwt();
}
