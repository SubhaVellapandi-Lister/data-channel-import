export class EmailValidator {
    /**
   * Method to validate the email address defined in the input file
   * @param email
   * @param isRequired
   * @returns boolean true if valid
   */
    public validateEmail(email: string, isRequired: boolean): boolean {
    // Regex to validate widely used email formats
        const emailRegexToTest = /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
        // do not evaluate if email is empty
        if (!isRequired && !email) return true;
        if (email.length > 256 || !emailRegexToTest.test(email)) return false;
        // Check on the length of the domain part and the account part of an email which regex does not evaluate
        const [account, address] = email.split('@');
        if (account.length > 64) return false;
        const emailDomainParts = address.split('.');
        return !emailDomainParts.some((domainPart) => {
            domainPart.length > 63;
        });
    }
}
