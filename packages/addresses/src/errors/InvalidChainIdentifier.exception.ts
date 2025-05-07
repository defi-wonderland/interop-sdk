export class InvalidChainIdentifier extends Error {
    constructor(chainReference: string) {
        super(`Invalid chain identifier: ${chainReference}`);
    }
}
