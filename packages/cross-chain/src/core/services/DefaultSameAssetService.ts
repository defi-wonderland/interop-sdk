import type { Address } from "viem";

import type { SameAssetService } from "../interfaces/sameAsset.interface.js";
import type { AssetId, ChainId, SameAssetMap } from "../schemas/sameAsset.js";
import { ConflictingAssetIdentity } from "../errors/ConflictingAssetIdentity.exception.js";
import { toCanonicalNativeAddress } from "../utils/token.js";

/**
 * Default {@link SameAssetService}: resolves same-asset identity from a static
 * consumer-provided map.
 *
 * The map is flattened once on construction into a `chainId -> address -> assetId`
 * index. Addresses are normalised with {@link toCanonicalNativeAddress}, so lookups
 * are case-insensitive and native placeholders (`0x000…0` and `0xEee…E`) collapse to
 * a single key.
 *
 * Construction throws when one `(chainId, address)` is claimed by two different asset
 * ids: a conflicting identity is a consumer config error, never silently resolved.
 */
export class DefaultSameAssetService implements SameAssetService {
    private readonly index: ReadonlyMap<ChainId, ReadonlyMap<string, AssetId>>;

    constructor(assets: SameAssetMap) {
        const index = new Map<ChainId, Map<string, AssetId>>();
        for (const [assetId, byChain] of Object.entries(assets)) {
            for (const [chainKey, address] of Object.entries(byChain)) {
                const chainId = Number(chainKey);
                const key = toCanonicalNativeAddress(address, "eip155");
                const chain = index.get(chainId) ?? new Map<string, AssetId>();
                const existing = chain.get(key);
                if (existing !== undefined && existing !== assetId) {
                    throw new ConflictingAssetIdentity(chainId, address, existing, assetId);
                }
                chain.set(key, assetId);
                index.set(chainId, chain);
            }
        }
        this.index = index;
    }

    resolve(chainId: ChainId, address: Address): AssetId | undefined {
        return this.index.get(chainId)?.get(toCanonicalNativeAddress(address, "eip155"));
    }
}
