// Interface for channel config parameters.
// Interface for value mappings for the given column
export interface IValueMapping {
  fromValue: string;
  toValue: string;
}

export interface IFileTranslateConfig {
  /**
   * Map an old header to a new header.
   */
  headerMappings?: {
    [columnFromName: string]: string; // original name -> new name
  };

  /**
   * Map a index to a new header name. 1-indexed. This has priority over `headerMappings`
   */
  indexMappings?: {
    [index: number]: string; // original index -> new name
  };

  /**
   * Map an old value to a new value.
   */
  valueMappings?: {
    [columnName: string]: IValueMapping[]; // one or more value mappings for the given column
  };

  /**
   * If set to true, the translate processor will automatically update the channel config to save
   * `indexMappings` to reflect the current order of column mappings. This should only be used
   * when you need to support headerless csv files and the order of the columns is strictly enforced
   */
  saveIndexMappings?: boolean;

  /**
   * If set, then this file might be lacking a header row and the translate config should output a header row based on
   * `indexMappings` if needed.
   */
  headerlessFile?: boolean;

  /**
   * If set, then translate config should not remove empty header column from in output
   */
  removeEmptyHeaders?: boolean;

  /**
   * If set, then translate config should not remove unmapped header row based on
   * `indexMappings`.
   */
  removeUnmappedHeaders?: boolean;
}

export enum RowType {
  ROW = "ROW",
  HEADER = "HEADER",
}

// Interface for channel config parameters.
export interface ITranslateParameters {
  translateConfig: {
    [fileName: string]: IFileTranslateConfig;
  };
  inputFileNames?: string[];
  dynamicOutput: boolean;
  dynamicInput: boolean;
}
