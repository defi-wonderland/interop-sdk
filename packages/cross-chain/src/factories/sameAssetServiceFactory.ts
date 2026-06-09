import type { SameAssetMap, SameAssetService } from "../internal.js";
import { DefaultSameAssetService, SameAssetMapSchema } from "../internal.js";

/**
 * Builds a {@link SameAssetService} from a consumer-owned same-asset map.
 *
 * The map (`assetId -> chainId -> address`) is validated and indexed once. Pass the
 * result as `sameAssetService` to {@link createAggregator}; buildQuote then treats two
 * addresses as the same asset only when they resolve to the same id, and discovered
 * assets at the mapped addresses survive cross-provider symbol disagreements.
 *
 * Disclaimer: the SDK ships no asset list and maintains none. These pairings are owned
 * and kept up to date by the consumer.
 *
 * @example
 * const sameAssetService = createSameAssetService({
 *   USDC: { 1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
 * });
 */
export function createSameAssetService(assets: SameAssetMap): SameAssetService {
    SameAssetMapSchema.parse(assets);
    if (Object.keys(assets).length === 0) {
        throw new Error("createSameAssetService requires at least one asset");
    }
    return new DefaultSameAssetService(assets);
}
