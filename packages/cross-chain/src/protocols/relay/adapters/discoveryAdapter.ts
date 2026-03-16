import type { AssetInfo, NetworkAssets } from "../../../core/types/assetDiscovery.js";
import type { RelaySolverCurrency } from "../schemas.js";
import { RelayChainsResponseSchema } from "../schemas.js";

/**
 * Parse a Relay GET `/chains` response into `NetworkAssets[]`.
 *
 * @see https://docs.relay.link/references/api/get-chains
 */
export function parseRelayChainsResponse(data: unknown): NetworkAssets[] {
    const { chains } = RelayChainsResponseSchema.parse(data);

    return chains.filter(isActiveEvmChain).map(toNetworkAssetsEntry).filter(hasAssets);
}

function isActiveEvmChain(chain: { vmType?: string; disabled?: boolean }): boolean {
    const isEvm = !chain.vmType || chain.vmType === "evm";
    return isEvm && !chain.disabled;
}

function toNetworkAssetsEntry(chain: {
    id: number;
    solverCurrencies: RelaySolverCurrency[];
}): NetworkAssets {
    return {
        chainId: chain.id,
        assets: chain.solverCurrencies.map(toAssetInfo),
    };
}

function hasAssets(network: NetworkAssets): boolean {
    return network.assets.length > 0;
}

function toAssetInfo(currency: RelaySolverCurrency): AssetInfo {
    return {
        address: currency.address,
        symbol: currency.symbol,
        decimals: currency.decimals,
    };
}
