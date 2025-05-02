export class UnsupportedChainTypeError extends Error {
    constructor(chainType: string) {
        super(`Unsupported chain type: ${chainType}`);
    }
}
