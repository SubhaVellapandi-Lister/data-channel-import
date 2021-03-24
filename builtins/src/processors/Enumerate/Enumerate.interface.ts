export interface IEnumerateConfig {
    indexColumnName?: string;
    outputNames?: {
        [inputName: string]: string;
    };
}
