export class UnsupportedChainId extends Error {
    constructor(chainId: number) {
        super(`Non supported chain id: ${chainId}`);
    }
}
