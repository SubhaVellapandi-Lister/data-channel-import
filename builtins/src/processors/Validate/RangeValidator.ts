import { IRowData } from "@data-channels/dcSDK";

import { IFileConfig, IRangeLimit, IRangeLevelValues, ValidateStatus } from "./Validate.interface";

export class RangeValidator {
  private rangeLevelValues: IRangeLevelValues = {};

  /**
   * This method is used to check the range validation
   * @param data
   * @param columnConfig
   * @param columnName
   * @param validationErrors
   * @param validationStatus
   * @returns ValidateStatus
   */
  public validateRange(
      data: number,
      columnConfig: IFileConfig,
      columnName: string,
      validationErrors: string[],
      validationStatus: ValidateStatus
  ): ValidateStatus {
      if (columnConfig.range === null || columnConfig.range === undefined) {
          return validationStatus;
      }

      const range = columnConfig.range;
      let status = validationStatus;

      if (!("minVal" in range) || !("maxVal" in range)) {
          throw new Error(
              `column ${columnName} minVal or maxVal config missing in the range validation`
          );
      }

      status = this.validateNumberByLimit(
          data,
          columnConfig.range.minVal ?? 0,
          columnName,
          Math.min,
          validationErrors,
          status,
          "below the minimum",
          columnConfig.dependsOn
      );

      status = this.validateNumberByLimit(
          data,
          columnConfig.range.maxVal ?? 0,
          columnName,
          Math.max,
          validationErrors,
          status,
          "above the maximum",
          columnConfig.dependsOn
      );

      return status;
  }

  private validateNumberByLimit(
      data: number,
      limit: number | IRangeLimit,
      columnName: string,
      validatorFunc: Function,
      validationErrors: string[],
      validationStatus: ValidateStatus,
      errorDescription: string,
      dependsOn = ""
  ): ValidateStatus {
      if (typeof limit === "object" && this.rangeLevelValues[dependsOn] !== undefined) {
          const limitByLevel = limit[this.rangeLevelValues[dependsOn] ?? ''];

          if (isNaN(limitByLevel)) {
              validationErrors.push(`Value for ${columnName} is missing for range limit ${dependsOn}`);
              return ValidateStatus.Invalid;
          }
          if (limitByLevel !== data && validatorFunc(data, limitByLevel) === data) {
              validationErrors.push(`Value ${data} for ${columnName} is ${errorDescription} of ${limitByLevel}`);
              return ValidateStatus.Invalid;
          }
      } else if (typeof limit === "number" && data !== limit && validatorFunc(data, limit) === data) {
          validationErrors.push(`Value ${data} for ${columnName} is ${errorDescription} of ${limit}`);
          return ValidateStatus.Invalid;
      }

      return validationStatus;
  }

  //Min Max ranges are only supported for Numbers for now
  public setRangeLimitLevels(rowData: IRowData, rangeLimitSetters: Set<string>): void {
      for (const rangeSetter of rangeLimitSetters) {
          const limitLevel = parseInt(rowData[rangeSetter]);
          this.rangeLevelValues[rangeSetter] = isNaN(limitLevel) ? undefined : limitLevel;
      }
  }
}
