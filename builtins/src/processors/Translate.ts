import {
  BaseProcessor, ChannelConfig,
  IRowProcessorInput,
  IRowProcessorOutput,
} from "@data-channels/dcSDK";
import * as _ from 'lodash';

export interface IValueMapping {
  fromValue: string;
  toValue: string;
}

export interface ITranslateConfig {
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
}

export default class Translate extends BaseProcessor {
  private originalHeaders: string[] = [];
  private newHeaders: string[] = [];
  private config!: ITranslateConfig;

  public async translate(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
    this.config = _.cloneDeep(input.parameters!["translateConfig"]) as ITranslateConfig;

    if (this.config == null) {
      throw new Error('Missing translateConfig in Translate-Builtin');
    }

    if (input.index === 1) {
      this.originalHeaders = input.raw;
      this.newHeaders = this.originalHeaders.map((h, i) =>
        this.mappedHeader(h, i + 1)
      );

      console.log(this.config);
      console.log('new headers', this.newHeaders);

      if (this.config.saveIndexMappings) {
        await this.saveIndexMappings();
      }

      if (this.config.headerlessFile) {
        await this.checkHeaderRow(input.name);

        return {
          index: input.index,
          outputs: {
            [`${input.name}Translated`]: input.raw,
          },
        };
      }

      return {
        index: input.index,
        outputs: {
          [`${input.name}Translated`]: this.newHeaders,
        },
      };
    }

    if (this.config.valueMappings == null) {
      return {
        index: input.index,
        outputs: {
          [`${input.name}Translated`]: input.raw,
        },
      };
    }

    const vmapConfig = this.config.valueMappings;
    const newRow: string[] = [];

    for (const [idx, val] of input.raw.entries()) {
      const originalHeader = this.originalHeaders[idx];
      const newHeader = this.newHeaders[idx];
      const vmap = vmapConfig[newHeader] ?? (vmapConfig[originalHeader] ?? []);
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

  /**
   * Check if we are missing a header row, or if we have one, make sure that it aligns with the headerMappings
   */
  private async checkHeaderRow(name: string) {
    if (this.config.indexMappings == null) {
      throw new Error('Headerless files must have indexMappings');
    }

    if (this.originalHeaders.length !== Object.values(this.config.indexMappings).length) {
      throw new Error('Headerless column length does not match mapping. Be sure indexMapping accounts for all columns');
    }

    const sortedCols = _.sortBy(Object.entries(this.config.indexMappings), (val) => val[0]).map((keyVal) => keyVal[1]);

    // @ts-ignore
    this._outputStreams.writeOutputValues({
      [`${name}Translated`]: sortedCols,
    });
  }

  private mappedHeader(original: string, index: number): string {
    if (this.config.headerMappings) {
      return this.config.headerMappings[original] ?? original;
    } else if (this.config.indexMappings) {
      return this.config.indexMappings[index] ?? original;
    }

    return original;
  }

  private async saveIndexMappings() {
    // Fetch config from service to avoid any weird inline channel stuff
    const channel = await ChannelConfig.getConfig(this.job.channel.guid);

    if (channel == null) {
      // Something very wrong here
      console.error('Could not get channel config for saveIndexMappings');

      return;
    }

    const steps = channel.steps;
    const currentStep = steps[this.job.currentStep!];

    // This might be a parent config, in which case it isn't safe to modify
    if (currentStep == null || currentStep.parameters == null) {
      console.error(
          `Translate step config not found in channel config.
          Translate step should be defined in parent and child config to support auto-saving`
      );

      return;
    } else if (this.config.headerMappings == null && this.config.indexMappings == null) {
      return;
    }

    if (this.config.headerMappings == null) {
      // First run with index saving, create headerMapping based on current order
      this.config.headerMappings = _.fromPairs(_.zip(this.originalHeaders, this.newHeaders));
    }

    this.config.indexMappings = _.fromPairs([
        ...this.newHeaders.entries()].map(([i, val]) => [i + 1, val])
    );

    currentStep.parameters['translateConfig'] = this.config;

    await channel.update({ steps });
  }
}
