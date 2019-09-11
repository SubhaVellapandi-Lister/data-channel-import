import request from "request-promise-native";

export async function getSchools(rootUrl: string, JWT: string): Promise<string[]> {
    const schoolIds = [];
    const body = await request(
        rootUrl + '/tree?root=naviance&depth=1', { headers: { Authorization: JWT}, json: true});

    for (const schoolId of Object.keys(body['naviance'])) {
        if (schoolId.endsWith('DUS') || schoolId.endsWith('USPU')) {
            schoolIds.push(schoolId);
        }
    }

    return schoolIds;
}
