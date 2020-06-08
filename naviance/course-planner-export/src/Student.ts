
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
    counselorId?: number;
    counselorName?: string;
}

export interface INavianceStudentIDMap {
    [hsId: string]: INavianceStudent[];
}
