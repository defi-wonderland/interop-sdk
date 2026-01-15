export class MissingInteroperableName extends Error {
    constructor() {
        super("Interoperable name cannot be empty");
    }
}
