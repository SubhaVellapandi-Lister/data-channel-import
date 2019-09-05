
import {
    RulesRepository
} from "@academic-planner/apSDK";

export function initRulesRepo(params: object) {
    RulesRepository.init({
        url: params['rulesRepoUrl'],
        jwt: params['rulesRepoJWT'],
        product: params['rulesRepoProduct']
    });
}
