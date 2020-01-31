import { IRowData } from "@data-channels/dcSDK";
import parse from "csv-parse";
import {Readable} from 'stream';

export interface IBasicNavianceStudent {
    id: number;
    highschoolId: string;
    sisId: string;
    isActive: boolean;
}

export interface INavianceStudent extends IBasicNavianceStudent {
    firstName?: string;
    lastName?: string;
    classYear?: number;
    highschoolName?: string;
}

export interface INavianceStudentIDMap {
    [hsId: string]: INavianceStudent[];
}

export function readStudents(istream: Readable) {
    const parser = parse({ bom: true, skip_empty_lines: true, skip_lines_with_empty_values: true});

    return new Promise<INavianceStudent[]>((resolve, reject) => {
        let index = 1;
        const students: INavianceStudent[] = [];
        let isReading = false;
        let isEnded = false;
        parser.on('readable', async () => {
            if (isReading) {
                return;
            }
            isReading = true;

            try {
                let record = parser.read();

                while (record) {
                    const raw = record as string[];
                    if (index === 1) {
                        // skip header
                        continue;
                    }

                    try {
                        const student = JSON.parse(raw[0]) as INavianceStudent;
                        students.push(student);
                    } catch (error) {
                        // skip row if it won't parse
                    }

                    record = parser.read();
                    index += 1;
                }
            } catch (err) {
                reject(err);

                return;
            }

            isReading =  false;
            if (isEnded) {
                // if we've already received an 'end' notification then just resolve the promise
                resolve(students);
            }
        });
        parser.on('end', () => {
            isEnded = true;
            if (!isReading) {
               setTimeout(() => resolve(students), 10);
            }
        });
        parser.on('error', (err) => {
            console.log(`CSV Read Error ${err}`);
            reject(err);
        });
        parser.on('skip', (err) => {
            console.log(`CSV Row Skipped ${err}`);
        });
        istream.pipe(parser);
    });
}
