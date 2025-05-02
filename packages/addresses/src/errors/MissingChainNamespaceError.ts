export class MissingChainNamespaceError extends Error {
    constructor() {
        super("Chain namespace is required in the address");
    }
}
