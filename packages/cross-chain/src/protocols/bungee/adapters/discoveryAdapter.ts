import type { AssetInfo, NetworkAssets } from "../../../core/types/assetDiscovery.js";
import type { BungeeTokenListResponse } from "../schemas.js";
import { BungeeTokenListResponseSchema } from "../schemas.js";

type BungeeTokenExt = BungeeTokenListResponse["result"][string][number];

/**
 * Parse a Bungee GET `/api/v1/tokens/list` response into `NetworkAssets[]`.
 *
 * Extracts token address, symbol, and decimals for each chain, filtering
 * out chains with no tokens.
 */
export function parseBungeeTokenListResponse(data: unknown): NetworkAssets[] {
    const { result } = BungeeTokenListResponseSchema.parse(data);

    return Object.entries(result)
        .map(([chainId, tokens]) => toNetworkAssets(Number(chainId), tokens))
        .filter((network) => network.assets.length > 0);
}

function toNetworkAssets(chainId: number, tokens: BungeeTokenExt[]): NetworkAssets {
    return {
        chainId,
        assets: tokens.map(toAssetInfo),
    };
}

function toAssetInfo(token: BungeeTokenExt): AssetInfo {
    return {
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
    };
}
