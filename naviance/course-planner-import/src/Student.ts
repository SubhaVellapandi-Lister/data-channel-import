import { IRowData } from "@data-channels/dcSDK";

export interface IBasicNavianceStudent {
    id: number;
    highschoolId: string;
    isActive: boolean;
    sisId: string;
}

export interface INavianceStudent extends IBasicNavianceStudent {
    highschoolId: string;
    firstName: string;
    lastName: string;
    classYear: number;
    highschoolName: string;
}

export interface INavianceStudentIDMap {
    [hsId: string]: IBasicNavianceStudent[];
}
