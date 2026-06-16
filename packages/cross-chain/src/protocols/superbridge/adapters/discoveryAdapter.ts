import type { AssetInfo, NetworkAssets } from "../../../core/types/assetDiscovery.js";
import type { SuperbridgeToken } from "../schemas.js";
import { SuperbridgeTokensResponseSchema } from "../schemas.js";

/** Parse a Superbridge GET `/v1/tokens` response into `NetworkAssets[]`. */
export function parseSuperbridgeTokens(data: unknown): NetworkAssets[] {
    const { tokens } = SuperbridgeTokensResponseSchema.parse(data);
    const byChain = new Map<number, AssetInfo[]>();

    for (const token of tokens) {
        const chainId = Number(token.chainId);
        if (!Number.isFinite(chainId)) continue;
        const assets = byChain.get(chainId) ?? [];
        assets.push(toAssetInfo(token));
        byChain.set(chainId, assets);
    }

    return [...byChain.entries()]
        .map(([chainId, assets]) => ({ chainId, assets }))
        .filter((network) => network.assets.length > 0);
}

function toAssetInfo(token: SuperbridgeToken): AssetInfo {
    return {
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        name: token.name,
        logoURI: token.logoUri ?? undefined,
    };
}
