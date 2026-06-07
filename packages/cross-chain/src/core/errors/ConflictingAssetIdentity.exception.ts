import type { Address } from "viem";

import type { AssetId, ChainId } from "../schemas/sameAsset.js";

/** Thrown when one `(chainId, address)` is claimed by two different asset ids in a same-asset map. */
export class ConflictingAssetIdentity extends Error {
    constructor(
        public readonly chainId: ChainId,
        public readonly address: Address,
        public readonly existingId: AssetId,
        public readonly conflictingId: AssetId,
    ) {
        super(
            `Address ${address} on chain ${chainId} is mapped to conflicting asset ids "${existingId}" and "${conflictingId}"`,
        );
        this.name = "ConflictingAssetIdentity";
    }
}
