import { BaseProcessor, IFileProcessorInput, IFileProcessorOutput } from "@data-channels/dcSDK";
import request from "request-promise-native";
import { getJWT, initServices } from "./Utils";

export class SchoolsProcessor extends BaseProcessor {

    public async findSchools(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        initServices(input.parameters!);
        let schools: string[] = [];
        if (input.parameters!['schools']) {
            schools = input.parameters!['schools'];
        } else {
            schools = await this.getSchools(input.parameters!['rulesRepoUrl']);
        }

        return {
            results: {
                schools
            }
        };
    }

    private async getSchools(rootUrl: string): Promise<string[]> {
        const schoolIds = [];
        const JWT = await getJWT();
        const body = await request(
            rootUrl + '/tree?root=naviance&depth=1', { headers: { Authorization: JWT }, json: true});

        for (const schoolId of Object.keys(body['naviance'])) {
            if (schoolId.endsWith('DUS') || schoolId.endsWith('USPU')) {
                schoolIds.push(schoolId);
            }
        }

        return schoolIds;
    }
}
