import { DateUtil } from './DateUtil';
import { ValidateComparator, ValidateDateFormat } from './Validate.interface';

export class DateValidator {
    /**
   * Method to validate the date format defined in the config against the input file
   * @param inputDate
   * @param isRequired
   * @param dateFormat
   * @returns boolean true if valid and in the expected format
   */
    public validateDateFormat(inputDate: string, isRequired: boolean, dateFormat: ValidateDateFormat): boolean {
        if (!isRequired && !inputDate) return true;
        switch (dateFormat) {
        case ValidateDateFormat.YYYY_MM_DD: {
            return DateUtil.isYYYY_MM_DD(inputDate);
        }
        case ValidateDateFormat.YY_MM_DD_HH_MM_SS: {
            return DateUtil.isYYYY_MM_DD_HH_MM_SS(inputDate);
        }
        case ValidateDateFormat.HH_MM_AM_PM: {
            return DateUtil.isHH_MM_AM_PM(inputDate);
        }
        case ValidateDateFormat.YYYYMMDD: {
            return DateUtil.isYYYYMMDD(inputDate);
        }
        case ValidateDateFormat.YYYYMM: {
            return DateUtil.isYYYYMM(inputDate);
        }
        case ValidateDateFormat.YYYY: {
            return DateUtil.isYYYY(inputDate);
        }
        default: {
            return false;
        }
        }
    }
    /**
   * Method to validate the date format and compare the given date fields,
   * using the comparator operations defined in the config against the input file
   * @param inputDate
   * @param compareDate
   * @param compartor
   * @param isRequired
   * @param dateFormat
   * @returns boolean true if valid and satisfies the comparsion
   */
    public validateDateComparsion(
        inputDate: string,
        compareDate: string,
        compartor: ValidateComparator,
        isRequired: boolean,
        dateFormat: ValidateDateFormat
    ): boolean {
        if (!isRequired && !inputDate && !compareDate) return true;
        // if the date format is YYYYMMDD, confirms its a validate date
        // and convert into the YYYY-MM-DD
        if (ValidateDateFormat.YYYYMMDD === dateFormat) {
            inputDate = DateUtil.convert_YYYYMMDD_To_YYYY_MM_DD(inputDate);
            compareDate = DateUtil.convert_YYYYMMDD_To_YYYY_MM_DD(compareDate);
        } else if (ValidateDateFormat.HH_MM_AM_PM === dateFormat) {
            inputDate = DateUtil.convert_HH_MM_To_Date(inputDate);
            compareDate = DateUtil.convert_HH_MM_To_Date(compareDate);
        }
        switch (compartor) {
        case ValidateComparator.Equal: {
            return DateUtil.compareDates(inputDate, compareDate) === 0;
        }
        case ValidateComparator.Greater: {
            return DateUtil.compareDates(inputDate, compareDate) === 1;
        }
        case ValidateComparator.GreaterEq: {
            return (
                DateUtil.compareDates(inputDate, compareDate) === 0 || DateUtil.compareDates(inputDate, compareDate) === 1
            );
        }
        case ValidateComparator.Lesser: {
            return DateUtil.compareDates(inputDate, compareDate) === -1;
        }
        case ValidateComparator.LesserEq: {
            return (
                DateUtil.compareDates(inputDate, compareDate) === 0 || DateUtil.compareDates(inputDate, compareDate) === -1
            );
        }
        default: {
            return false;
        }
        }
    }
}
