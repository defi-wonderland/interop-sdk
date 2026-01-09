export class InvalidChainType extends Error {
    constructor(chainType: string) {
        super(`Invalid chain type: ${chainType}`);
    }
}
