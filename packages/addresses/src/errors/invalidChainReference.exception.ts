export class InvalidChainReference extends Error {
    constructor(message?: string) {
        super(message || "Invalid chain reference");
    }
}
