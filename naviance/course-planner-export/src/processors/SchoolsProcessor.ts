import { BaseProcessor, IRowProcessorInput, IRowProcessorOutput, IStepAfterInput } from "@data-channels/dcSDK";
import fetch from "node-fetch";
import { getJWT, initServices } from "../Utils";

export class SchoolsProcessor extends BaseProcessor {
    private schoolsByDistrict: { [dsId: string]: string[]} = {};
    private districtIdByNavianceId: { [navId: string]: string } = {};
    private schoolNamesById: { [navId: string]: string } = {};
    private batchHighschoolOutputName = 'BatchHighschools';

    public async findSchools(input: IRowProcessorInput): Promise<IRowProcessorOutput> {

        if (input.index === 1) {
            return {
                outputs: {
                    [this.batchHighschoolOutputName]: ['HighschoolId']
                }
            };
        }

        const hsId = input.data['Id'].replace(/\s+/g, '');
        const hsName = input.data['Name'].trim();
        let hsInfo = hsId;
        if (input.parameters!['includeNames']) {
            hsInfo = `${hsId},${hsName}`;
        }

        this.districtIdByNavianceId[hsId] = input.data['DistrictAssignedId'] || '';
        this.schoolNamesById[hsId] = hsName;

        if (input.data['DistrictId'] && input.data['DistrictId'].length > 4) {
            // has a district
            const dsId = input.data['DistrictId'].replace(/\s+/g, '');
            if (!this.schoolsByDistrict[dsId]) {
                this.schoolsByDistrict[dsId] = [];
            }
            this.schoolsByDistrict[dsId].push(hsInfo);
        } else {
            this.schoolsByDistrict[hsId] = [hsInfo];
        }

        return {
            outputs: {}
        };
    }

    public async after_findSchools(input: IStepAfterInput) {
        initServices(input.parameters!);
        let schools: string[] = [];
        if (input.parameters!['schools']) {
            schools = input.parameters!['schools'];
        } else if (input.parameters!['tenantId']) {
            schools = [input.parameters!['tenantId']];
        } else {
            schools = await this.getSchools(input.parameters!['rulesRepoUrl']);
        }

        let districtIds = schools;
        if (input.parameters!['namespace']) {
            districtIds = [input.parameters!['namespace']];
        }

        const fullDistrictList: { [dsId: string]: string[]} = {};
        const schoolAssignedIDs: { [id: string]: string } = {};
        const schoolNames: { [id: string]: string } = {};


        for (const schoolId of districtIds) {
            if (this.schoolsByDistrict[schoolId]) {
                fullDistrictList[schoolId] = this.schoolsByDistrict[schoolId];
                for (const hsId of fullDistrictList[schoolId]) {
                    schoolAssignedIDs[hsId] = this.districtIdByNavianceId[hsId];
                    schoolNames[hsId] = this.schoolNamesById[hsId];

                    if (input.outputs[this.batchHighschoolOutputName]) {
                        const output = input.outputs[this.batchHighschoolOutputName].writeStream;
                        this.writeOutputRow(output, [hsId]);
                    }
                }
            }
        }

        return {
            results: {
                schools,
                hsMapping: fullDistrictList,
                schoolAssignedIDs,
                schoolNames
            }
        };
    }

    private async getSchools(rootUrl: string): Promise<string[]> {
        const schoolIds: string[] = [];
        const JWT = await getJWT();
        const resp = await fetch(
            rootUrl + '/tree?root=naviance&depth=1', { headers: { Authorization: JWT }});

        const body = await resp.json();
        for (const schoolId of Object.keys(body['naviance'])) {
            if (schoolId.endsWith('DUS') || schoolId.endsWith('USPU') || schoolId.endsWith('USPR')) {
                schoolIds.push(schoolId);
            }
        }

        return schoolIds;
    }
}
