export class UnsupportedChainType extends Error {
    constructor(chainType: string) {
        super(`Unsupported chain type: ${chainType}`);
    }
}
