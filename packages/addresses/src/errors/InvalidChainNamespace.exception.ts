export class InvalidChainNamespace extends Error {
    constructor(chainNamespace: string) {
        super(`Invalid chain namespace: ${chainNamespace}`);
    }
}
