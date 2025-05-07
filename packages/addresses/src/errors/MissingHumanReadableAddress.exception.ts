export class MissingHumanReadableAddress extends Error {
    constructor() {
        super("Human readable address cannot be empty");
    }
}
