export class MissingHumanReadableAddressError extends Error {
    constructor() {
        super("Human readable address cannot be empty");
    }
}
