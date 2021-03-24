import { IFindCriteria } from '@data-channels/dcSDK';

export interface IJobDeleteCriteria {
    expiryDate?: IFindCriteria<string, '=' | '>=' | '<='>;
}

export interface IJobDeleteConfig {
    maxDeletionsPerJob: number;
    criteria?: IJobDeleteCriteria;
    hardDelete?: boolean;
    forceDelete?: boolean;
}

export interface IDeleteConfig {
    jobs?: IJobDeleteConfig;
}

export interface IJobsResult {
    total: number;
    deleted: number;
    error: number;
}

export interface IDeleteResult {
    jobs?: IJobsResult;
}
