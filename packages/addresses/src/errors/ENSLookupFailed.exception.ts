export class ENSLookupFailed extends Error {
    constructor(message: string) {
        super(`Failed to resolve ENS name: ${message}`);
    }
}
