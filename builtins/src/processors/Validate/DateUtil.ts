export class DateUtil {
    static isYYYY_MM_DD(dateString: string): boolean {
    // regex to evaluate date in the format yyyy-mm--dd
        const regEx = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateString.match(regEx)) return false;
        const d = new Date(dateString);
        const dNum = d.getTime();
        if (!dNum && dNum !== 0) return false;
        return d.toISOString().slice(0, 10) === dateString;
    }
    static isHH_MM_SS(timeString: string): boolean {
    // regex to evaluate date in the format HH:mm:ss
        const regEx = /^(2[0-3]|[01][0-9]):[0-5][0-9]:[0-5][0-9]$/;
        return timeString.match(regEx) ? true : false;
    }

    static isYYYY_MM_DD_HH_MM_SS(dateTimeString: string): boolean {
        const dateTime = dateTimeString.split(" ");
        if (dateTime !== null && dateTime.length === 2) {
            return this.isYYYY_MM_DD(dateTime[0]) && this.isHH_MM_SS(dateTime[1]);
        }
        return false;
    }
    static isHH_MM_AM_PM(timeString: string): boolean {
    // regex to evaluate date in the format hh:mm am/pm
        const regEx = /^((1[0-2]|0?[1-9]):([0-5][0-9]) ?([AaPp][Mm]))$/;
        return timeString.match(regEx) ? true : false;
    }
    static isYYYYMMDD(dateString: string): boolean {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const date = dateString.substring(6, 8);
        return this.isYYYY_MM_DD(year + "-" + month + "-" + date);
    }

    static isYYYYMM(dateString: string): boolean {
    // regex to evaluate date in the format yyyymm
        const regEx = /^\d{4}(0[1-9]|1[0-2])$/;
        return dateString.match(regEx) ? true : false;
    }

    static compareDates(date1: string, date2: string): number {
        const inputDate1 = Date.parse(date1);
        const inputDate2 = Date.parse(date2);
        return inputDate1 > inputDate2 ? 1 : inputDate1 < inputDate2 ? -1 : 0;
    }
    static convert_YYYYMMDD_To_YYYY_MM_DD(dateString: string): string {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const date = dateString.substring(6, 8);
        return year + "-" + month + "-" + date;
    }
}
