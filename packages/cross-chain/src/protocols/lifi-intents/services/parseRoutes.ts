import type { AssetInfo, NetworkAssets } from "../../../core/types/assetDiscovery.js";
import { LifiIntentsRoutesResponseSchema } from "../schemas.js";

export function parseRoutesIntoAssets(data: unknown): NetworkAssets[] {
    const { routes } = LifiIntentsRoutesResponseSchema.parse(data);
    const chainAssetMap = new Map<number, Map<string, AssetInfo>>();

    for (const route of routes) {
        const fromChainId = Number(route.fromChain.chainId);
        const toChainId = Number(route.toChain.chainId);
        addToMap(chainAssetMap, fromChainId, route.fromToken);
        addToMap(chainAssetMap, toChainId, route.toToken);
    }

    return Array.from(chainAssetMap.entries()).map(([chainId, assets]) => ({
        chainId,
        assets: Array.from(assets.values()),
    }));
}

function addToMap(
    map: Map<number, Map<string, AssetInfo>>,
    chainId: number,
    token: { address: string; symbol: string | null; name: string | null; decimals: number },
): void {
    if (!map.has(chainId)) {
        map.set(chainId, new Map());
    }
    const key = token.address.toLowerCase();
    if (!map.get(chainId)!.has(key)) {
        map.get(chainId)!.set(key, {
            address: token.address,
            symbol: token.symbol ?? "",
            decimals: token.decimals,
            name: token.name ?? undefined,
        });
    }
}
