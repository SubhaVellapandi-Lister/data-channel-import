import {
  PlanningEngine,
  RulesRepository
} from "@academic-planner/apSDK";

export function initRulesRepo(params: object) {
    const config: any = {
        url: params['rulesRepoUrl'],
        jwt: params['JWT'] || '',
        product: params['rulesRepoProduct']
    };
    if (params['auth0ClientId']) {
        config.auth0 = {
            clientId: params['auth0ClientId'],
            clientSecret: params['auth0ClientSecret'],
            domain: params['auth0Domain'],
            audience: params['auth0Audience']
        };
    }
    console.log('RULES REPO URL', config.url);
    RulesRepository.init(config);
}

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
    const repoConfig = Object.assign({}, config);
    repoConfig.product = 'naviance';
    repoConfig.url = parameters['rulesRepoUrl'];
    RulesRepository.init(repoConfig);
}
