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
    public validateDateFormat(
        inputDate: string,
        isRequired: boolean,
        dateFormat: ValidateDateFormat
    ): boolean {
        const dateUtil = new DateUtil();
        if (!isRequired && !inputDate) return true;
        switch (dateFormat) {
        case ValidateDateFormat.YYYY_MM_DD: {
            return dateUtil.isYYYY_MM_DD(inputDate);
        }
        case ValidateDateFormat.YY_MM_DD_HH_MM_SS: {
            return dateUtil.isYYYY_MM_DD_HH_MM_SS(inputDate);
        }
        case ValidateDateFormat.HH_MM_AM_PM: {
            return dateUtil.isHH_MM_AM_PM(inputDate);
        }
        case ValidateDateFormat.YYYYMMDD: {
            return dateUtil.isYYYYMMDD(inputDate);
        }
        case ValidateDateFormat.YYYYMM: {
            return dateUtil.isYYYYMM(inputDate);
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
        const dateUtil = new DateUtil();
        if (!isRequired && !inputDate && !compareDate) return true;
        // if the date format is YYYYMMDD, confirms its a validate date
        // and convert into the YYYY-MM-DD
        if (ValidateDateFormat.YYYYMMDD === dateFormat) {
            inputDate = dateUtil.convert_YYYYMMDD_To_YYYY_MM_DD(inputDate);
            compareDate = dateUtil.convert_YYYYMMDD_To_YYYY_MM_DD(compareDate);
        }
        switch (compartor) {
        case ValidateComparator.Equal: {
            return dateUtil.isdateEqual(inputDate, compareDate);
        }
        case ValidateComparator.Greater: {
            return dateUtil.isdateGreater(inputDate, compareDate);
        }
        case ValidateComparator.GreaterEq: {
            return dateUtil.isdateGreaterEqual(inputDate, compareDate);
        }
        case ValidateComparator.Lesser: {
            return dateUtil.isdateLesser(inputDate, compareDate);
        }
        case ValidateComparator.LesserEq: {
            return dateUtil.isdateLesserEqual(inputDate, compareDate);
        }
        default: {
            return false;
        }
        }
    }
}
