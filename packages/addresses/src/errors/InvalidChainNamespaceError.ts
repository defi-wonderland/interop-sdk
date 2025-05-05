export class InvalidChainNamespaceError extends Error {
    constructor(chainNamespace: string) {
        super(`Invalid chain namespace: ${chainNamespace}`);
    }
}
