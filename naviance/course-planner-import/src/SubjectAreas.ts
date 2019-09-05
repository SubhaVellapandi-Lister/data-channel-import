import { Annotations, AnnotationType, Namespace } from "@academic-planner/apSDK";
import { IRowData } from "@data-channels/dcSDK";
import { scedMapping } from "./Contants";

export interface ISubjectAreaLoad {
    foundSubArea?: AnnotationType;
    subjectAreaMapping: { [key: string]: string[] };
}

export function getCombinedSubjectArea(subName: string, scedCode: string, subLoad: ISubjectAreaLoad): string {
    const navCode = scedMapping[scedCode] || '';
    if (subLoad.subjectAreaMapping[subName]) {
        if (subLoad.subjectAreaMapping[subName].includes(navCode)) {
            return `${navCode}_${subName}`;
        }

        return `${subLoad.subjectAreaMapping[subName][0]}_${subName}`;
    }

    return 'Basic Skills_Unknown';
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
            const [navSub, schoolSub] = subString.split('_');
            if (!results.subjectAreaMapping[schoolSub]) {
                results.subjectAreaMapping[schoolSub] = [];
            }
            results.subjectAreaMapping[schoolSub].push(navSub);
        }
    }

    return results;
}

export function parseSubjectAreaRow(data: IRowData, subMap: { [key: string]: string[]}): boolean {
    let created = false;

    if (data['JSON_OBJECT']) {
        // migration file
        const rowObj = JSON.parse(data['JSON_OBJECT']);
        if (rowObj.subjectArea) {
            const name = rowObj['subjectArea']['name'];
            if (!subMap[name]) {
                subMap[name] = [];
            }
            subMap[name].push(rowObj['subjectArea']['category']);
        }
    } else {
        // client file, no naviance code so look for sced
        const rowSub = data['Subject_Area'];
        const rowSced = data['SCED_Subject_Area'];

        if (!rowSced || !rowSub || !rowSced.length || !rowSub.length) {
            return false;
        }

        const scedMap = scedMapping[rowSced] || scedMapping['0' + rowSced];

        if (scedMap) {
            if (!subMap[rowSub]) {
                subMap[rowSub] = [];
            }
            if (!subMap[rowSub].includes(scedMap)) {
                created = true;
                subMap[rowSub].push(scedMap);
            }
        }
    }

    return created;
}

export async function saveSubjectAreas(namespace: string, subLoad: ISubjectAreaLoad): Promise<boolean> {
    let subjectAreaValues: string[] = [];
    for (const subName of Object.keys(subLoad.subjectAreaMapping)) {
        for (const navCode of subLoad.subjectAreaMapping[subName]) {
            subjectAreaValues.push(`${navCode}_${subName}`);
        }
    }

    if (!subjectAreaValues.includes('Basic Skills_Unknown')) {
        subjectAreaValues = subjectAreaValues.concat('Basic Skills_Unknown');
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
