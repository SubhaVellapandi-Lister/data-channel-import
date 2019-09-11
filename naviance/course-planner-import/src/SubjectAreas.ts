import { Annotations, AnnotationType, Namespace } from "@academic-planner/apSDK";
import { IRowData } from "@data-channels/dcSDK";
import { csscMapping, scedMapping } from "./Contants";

export interface ISubjectAreaCodePair {
    scedCode: number;
    csscCode: number;
}
export interface ISubjectAreaLoad {
    foundSubArea?: AnnotationType;
    subjectAreaMapping: { [key: string]: ISubjectAreaCodePair[] };
}

export function getCombinedSubjectArea(subName: string, scedCode: string, subLoad: ISubjectAreaLoad): string {
    if (subLoad.subjectAreaMapping[subName]) {
        for (const codePair of subLoad.subjectAreaMapping[subName]) {
            if (codePair.scedCode === parseInt(scedCode)) {
                return `${subName}_${codePair.csscCode}_${codePair.scedCode}`;
            }
        }
    }

    return `${subName}_0_22`;
}

export async function loadExistingSubjectAreas(namespace: string): Promise<ISubjectAreaLoad> {
    const results: ISubjectAreaLoad = { subjectAreaMapping: {} };
    const subjectAreaPager = AnnotationType.find(
        new Namespace(namespace), { findCriteria: { name: 'SUBJECT_AREA' } });
    const subAreasFound = await subjectAreaPager.all();
    if (subAreasFound.length > 0) {
        const subArea = subAreasFound[0];
        results.foundSubArea = subArea;
        for (const subString of subArea.stringValues) {
            const subParts = subString.split('_');
            let name = '';
            let codePair = { csscCode: 0, scedCode: 0};
            if (subParts.length === 2) {
                // old style codes
                name = subParts[1];
                codePair = getSubjectCodePair(subParts[0]);
            } else {
                name = subParts[0];
                codePair.csscCode = parseInt(subParts[1]);
                codePair.scedCode = parseInt(subParts[2]);
            }

            if (!results.subjectAreaMapping[name]) {
                results.subjectAreaMapping[name] = [];
            }
            results.subjectAreaMapping[name].push(codePair);
        }
    }

    return results;
}

export function parseSubjectAreaRow(data: IRowData, subMap: { [key: string]: ISubjectAreaCodePair[]}): boolean {
    let created = false;

    if (data['JSON_OBJECT']) {
        // migration file
        const rowObj = JSON.parse(data['JSON_OBJECT']);
        if (rowObj.subjectArea) {
            const name = rowObj['subjectArea']['name'];
            if (!subMap[name]) {
                subMap[name] = [];
            }
            const codePair = getSubjectCodePair(rowObj['subjectArea']['category']);
            let exists = false;
            for (const existPair of subMap[name]) {
                if (codePair.csscCode === existPair.csscCode) {
                    exists = true;
                }
            }
            if (!exists) {
                subMap[name].push(codePair);
                created = true;
            }
        }
    } else {
        // client file, no naviance code so look for sced
        const rowSub = data['Subject_Area'];
        const rowSced = parseInt(data['SCED_Subject_Area']) || 0;

        if (!rowSced || !rowSub || !rowSub.length) {
            return false;
        }

        const scedMap = scedMapping[rowSced] || scedMapping[rowSced];

        if (scedMap) {
            if (!subMap[rowSub]) {
                subMap[rowSub] = [];
            }
            let exists = false;
            for (const codePair of subMap[rowSub]) {
                if (codePair.scedCode === rowSced) {
                    exists = true;
                }
            }
            if (!exists) {
                subMap[rowSub].push({ csscCode: 0, scedCode: rowSced});
                created = true;
            }
        }
    }

    return created;
}

export async function saveSubjectAreas(namespace: string, subLoad: ISubjectAreaLoad): Promise<boolean> {
    const subjectAreaValues: string[] = [];

    for (const subName of Object.keys(subLoad.subjectAreaMapping)) {
        for (const codePair of subLoad.subjectAreaMapping[subName]) {
            subjectAreaValues.push(`${subName}_${codePair.csscCode}_${codePair.scedCode}`);
        }
    }

    let createdAnnotationType = false;
    if (subLoad.foundSubArea) {
        subLoad.foundSubArea.values = subjectAreaValues;
    } else {
        createdAnnotationType = true;
        subLoad.foundSubArea = new AnnotationType(
            'SUBJECT_AREA',
            'Subject Area',
            Annotations.simple({
                description: "Type used to describe Subject Areas (MATHEMATICS_MATH)"
            }),
            subjectAreaValues
        );
    }
    await subLoad.foundSubArea!.save(new Namespace(namespace));

    return createdAnnotationType;
}

export function getSubjectCodePair(categoryName: string): ISubjectAreaCodePair {
    const codePair = { csscCode: 0, scedCode: 0};
    for (const scedCode of Object.keys(scedMapping)) {
        if (scedMapping[scedCode] === categoryName) {
            codePair.scedCode = parseInt(scedCode);
        }
    }
    for (const csscCode of Object.keys(csscMapping)) {
        if (csscMapping[csscCode] === categoryName) {
            codePair.csscCode = parseInt(csscCode);
        }
    }

    return codePair;
}
