export class NonSupportedChainId extends Error {
    constructor(chainId: number) {
        super(`Non supported chain id: ${chainId}`);
    }
}
