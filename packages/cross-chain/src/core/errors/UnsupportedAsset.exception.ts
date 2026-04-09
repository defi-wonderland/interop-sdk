/** Thrown when a provider does not support the requested asset route. */
export class UnsupportedAsset extends Error {
    constructor(
        providerId: string,
        input: { assetAddress: string; chainId: number },
        output: { assetAddress: string; chainId: number },
    ) {
        super(
            `Provider "${providerId}" does not support the route ` +
                `${input.assetAddress} (chain ${input.chainId}) -> ` +
                `${output.assetAddress} (chain ${output.chainId})`,
        );
        this.name = "UnsupportedAsset";
    }
}
