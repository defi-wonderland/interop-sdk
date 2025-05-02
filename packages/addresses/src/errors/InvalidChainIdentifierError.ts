export class InvalidChainIdentifierError extends Error {
    constructor(chainReference: string) {
        super(`Invalid chain identifier: ${chainReference}`);
    }
}
