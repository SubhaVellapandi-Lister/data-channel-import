import { BaseProcessor, IFileProcessorInput,
    IFileProcessorOutput, IRowProcessorInput, IRowProcessorOutput, IStepAfterInput } from "@data-channels/dcSDK";
import request from "request-promise-native";
import { getJWT, initServices } from "./Utils";

export class SchoolsProcessor extends BaseProcessor {
    private schoolsByDistrict: { [dsId: string]: string[]} = {};

    public async findSchools(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1 || input.data['HasLegacyCP'] !== '1') {
            return {
                outputs: {}
            };
        }

        const hsId = input.data['Id'].replace(/\s+/g, '');

        if (input.data['DistrictId'] && input.data['DistrictId'].length > 4) {
            // has a district
            const dsId = input.data['DistrictId'].replace(/\s+/g, '');
            if (!this.schoolsByDistrict[dsId]) {
                this.schoolsByDistrict[dsId] = [];
            }
            this.schoolsByDistrict[dsId].push(hsId);
        } else {
            this.schoolsByDistrict[hsId] = [hsId];
        }

        return {
            outputs: {}
        };
    }

    public async after_findSchools(input: IStepAfterInput) {
        console.log(`findSchools`, input.parameters);
        initServices(input.parameters!);
        let schools: string[] = [];
        if (input.parameters!['schools']) {
            schools = input.parameters!['schools'];
        } else {
            schools = await this.getSchools(input.parameters!['rulesRepoUrl']);
        }

        const fullDistrictList: { [dsId: string]: string[]} = {};
        for (const schoolId of schools) {
            if (this.schoolsByDistrict[schoolId]) {
                fullDistrictList[schoolId] = this.schoolsByDistrict[schoolId];
            }
        }

        return {
            results: {
                schools,
                hsMapping: fullDistrictList
            }
        };
    }

    private async getSchools(rootUrl: string): Promise<string[]> {
        const schoolIds = [];
        console.log('getting schools', rootUrl);
        const JWT = await getJWT();
        const body = await request(
            rootUrl + '/tree?root=naviance&depth=1', { headers: { Authorization: JWT }, json: true});

        for (const schoolId of Object.keys(body['naviance'])) {
            if (schoolId.endsWith('DUS') || schoolId.endsWith('USPU') || schoolId.endsWith('USPR')) {
                schoolIds.push(schoolId);
            }
        }
        console.log('schoolIds', schoolIds);

        return schoolIds;
    }
}
