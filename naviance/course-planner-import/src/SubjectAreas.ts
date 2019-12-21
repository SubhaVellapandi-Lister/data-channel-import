import { Annotations, AnnotationType, Namespace } from "@academic-planner/apSDK";
import { IRowData } from "@data-channels/dcSDK";
import { csscMapping, scedMapping } from "./Contants";
import { getRowVal } from "./Utils";

export interface ISubjectAreaCodePair {
    scedCode: number;
    csscCode: number;
}
export interface ISubjectAreaLoad {
    foundSubArea?: AnnotationType;
    subjectAreaMapping: { [key: string]: ISubjectAreaCodePair[] };
}

export function getCombinedSubjectArea(
    subName: string, scedCode: string, subLoad: ISubjectAreaLoad, stateCode: string
): string {
    if (scedCode && (!subName || !subName.length)) {
        subName = scedMapping[parseInt(scedCode)] || '';
    }
    if (subLoad.subjectAreaMapping[subName]) {
        for (const codePair of subLoad.subjectAreaMapping[subName]) {
            if (!scedCode || codePair.scedCode === parseInt(scedCode)) {
                return `${subName}_${codePair.csscCode}_${codePair.scedCode}`;
            }
        }
    }

    // return `${subName}_0_22`;
    return '';
}

export function getMigratedSubjectArea(subName: string, categoryName: string) {
    const codePair = getSubjectCodePair(categoryName);

    return `${subName}_${codePair.csscCode}_${codePair.scedCode}`;
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

export function parseSubjectAreaRow(
    data: IRowData, subMap: { [key: string]: ISubjectAreaCodePair[]}, noCreate: boolean = false
): boolean {
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
        if (noCreate) {
            return false;
        }
        let rowSub = getRowVal(data, 'Subject_Area') || getRowVal(data, 'SUBJECT_AREA_1') || '';
        const rowSced = parseInt(getRowVal(data, 'SCED_Subject_Area') || '0') || 0;

        if (rowSced && (!rowSub || !rowSub.length)) {
            rowSub = scedMapping[rowSced] || '';
        }
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

export async function saveDefaultAnnotationTypes(namespace: string) {
    const annoTypeData = {
        ACADEMIC_YEAR: {
            display: 'Academic Year',
            description: 'Type used to describe academic year (2018-2019)',
            value: [/^[0-9]{4}-[0-9]{4}$/]
        },
        BOOLEAN: {
            display: 'Boolean',
            description: 'Default type used for boolean properties',
            value: [/[0-1]/]
        },
        COURSE_STATUS: {
            display: 'Course status',
            description: 'Type used to describe valid status for courses',
            value: [/ACTIVE/, /INACTIVE/]
        },
        DECIMAL: {
            display: 'Decimal',
            description: 'Default type used for decimal properties',
            value: [/^\d*\.?\d*$/]
        },
        INTEGER: {
            display: 'Integer',
            description: 'Default type used for integer properties',
            value: [/^\d+$/]
        },
        LIST_ACADEMIC_YEAR: {
            display: 'List of Academic Years',
            description: 'Type used to describe a list of academic years',
            value: [/^([0-9]{4}-[0-9]{4})(,[0-9]{4}-[0-9]{4})*$/]
        },
        LIST_INTEGER: {
            display: 'List of Integers',
            description: 'Default type used for list of integer properties',
            value: [/^[\d[,\d]*]*$/]
        },
        LIST_STRING: {
            display: 'List of Strings',
            description: 'Default type used for list of strings properties',
            value: [/^.*$/]
        },
        STRING: {
            display: 'String',
            description: 'Default type used for string properties',
            value: [/^.*$/]
        }
    };

    console.log('looking for existing annotations');
    const existingPager = AnnotationType.find(new Namespace(namespace));
    const existing = await existingPager.all();
    const existingNames = existing.map((anno) => anno.name);
    console.log('found existing annotation names', existingNames);

    for (const annoName of Object.keys(annoTypeData)) {
        if (existingNames.includes(annoName)) {
            continue;
        }
        const details = annoTypeData[annoName];
        const newAnno = new AnnotationType(
            annoName,
            details['display'],
            Annotations.simple({
                description: details['description']
            }),
            details['value']
        );
        console.log('saving', annoName);
        try {
            await newAnno.save(new Namespace(namespace), 'import');
        } catch (err) {
            console.log(`save error`, err);
            await newAnno.save(new Namespace(namespace), 'import');
        }
    }
}

export async function saveSubjectAreas(namespace: string, subLoad: ISubjectAreaLoad): Promise<boolean> {
    const subjectAreaValues: string[] = [];

    for (const subName of Object.keys(subLoad.subjectAreaMapping)) {
        for (const codePair of subLoad.subjectAreaMapping[subName]) {
            subjectAreaValues.push(`${subName}_${codePair.csscCode}_${codePair.scedCode}`);
        }
    }

    if (!subjectAreaValues.length) {
        console.log('Error creating/updating subjects, no values');

        return false;
    }

    let createdAnnotationType = false;
    if (subLoad.foundSubArea) {
        subLoad.foundSubArea.values = subjectAreaValues;
        console.log(`subject areas object exists, updating`);
        console.log(subLoad.foundSubArea.guid);
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
        console.log('creating subject areas object');
    }
    try {
        await subLoad.foundSubArea!.save(new Namespace(namespace));
    } catch (err) {
        console.log(`save error`, err);
        await subLoad.foundSubArea!.save(new Namespace(namespace));
    }

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
        if (csscMapping[csscCode] === categoryName.toUpperCase()) {
            codePair.csscCode = parseInt(csscCode);
        }
    }

    return codePair;
}
