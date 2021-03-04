import { IFindCriteria } from '@data-channels/dcSDK';

export interface IJobDeleteCriteria {
    expiryDate?: IFindCriteria<string, '=' | '>=' | '<='>;
}

export interface IJobDeleteConfig {
    criteria?: IJobDeleteCriteria;
    hardDelete?: boolean;
}

export interface IDeleteConfig {
    jobs?: IJobDeleteConfig;
}

export interface IJobsResult {
    total: number;
    deleted: number;
}

export interface IDeleteResult {
    jobs?: IJobsResult;
}
