import {
  BaseProcessor,
  IRowProcessorInput,
  IRowProcessorOutput,
} from "@data-channels/dcSDK";

export interface IValueMapping {
  fromValue: string;
  toValue: string;
}

export interface ITranslateConfig {
  headerMappings?: {
    [columnfromName: string]: string; // original name -> new name
  };

  indexMappings?: string[]; // maps indexes to column names

  valueMappings?: {
    [columnName: string]: IValueMapping[]; // one or more value mappings for the given column
  };
}

export default class Translate extends BaseProcessor {
  private originalHeaders: string[] = [];
  private newHeaders: string[] = [];

  private mappedHeader(
    config: ITranslateConfig,
    original: string,
    index: number
  ): string {
    if (config.headerMappings && config.headerMappings[original]) {
      return config.headerMappings[original];
    }

    if (config.indexMappings && config.indexMappings[index]) {
      return config.indexMappings[index];
    }

    return original;
  }

  public async translate(
    input: IRowProcessorInput
  ): Promise<IRowProcessorOutput> {
    const config = input.parameters!["translateConfig"] as ITranslateConfig;
    if (input.index === 1) {
      this.originalHeaders = input.raw;
      this.newHeaders = this.originalHeaders.map((h, i) =>
        this.mappedHeader(config, h, i)
      );

      return {
        index: input.index,
        outputs: {
          [`${input.name}Translated`]: this.newHeaders,
        },
      };
    }

    const vmapConfig = config.valueMappings || {};
    const newRow: string[] = [];
    for (const [idx, val] of input.raw.entries()) {
      const originalHeader = this.originalHeaders[idx];
      const newHeader = this.newHeaders[idx];
      const vmap = vmapConfig[newHeader] || vmapConfig[originalHeader] || [];
      let value = val;
      for (const mappedVal of vmap) {
        if (mappedVal.fromValue === val) {
          value = mappedVal.toValue;
          break;
        }
      }
      newRow.push(value);
    }

    return {
      index: input.index,
      outputs: {
        [`${input.name}Translated`]: newRow,
      },
    };
  }
}
