import type { Address } from "viem";

import type { AssetId, ChainId } from "../schemas/sameAsset.js";

/**
 * Consumer-owned same-asset identity.
 *
 * The SDK ships and maintains no token list, so it does not decide which addresses
 * are "the same asset" across chains. When a service is provided, buildQuote's
 * same-asset check runs through it: input and output are the same asset only when
 * they resolve to the same id. The pairings are the consumer's to provide and keep
 * up to date. Without one, buildQuote keeps its default symbol/decimals/provider check.
 * Asset discovery also consults the service: tokens whose sources disagree on
 * symbol/decimals are dropped, except addresses the service resolves, which
 * survive symbol disagreements because the map already attests their identity.
 */
export interface SameAssetService {
    /** Canonical asset id for an address on a chain, or `undefined` when unrecognised. */
    resolve(chainId: ChainId, address: Address): AssetId | undefined;
}
