import type { AssetInfo, NetworkAssets } from "../../../core/types/assetDiscovery.js";
import type { RelaySolverCurrency } from "../schemas.js";
import { RelayChainsResponseSchema } from "../schemas.js";

/**
 * Parse a Relay GET `/chains` response into `NetworkAssets[]`.
 *
 * 1. Validates with {@link RelayChainsResponseSchema}
 * 2. Filters to EVM chains (`vmType` is `"evm"` or absent) that are not disabled
 * 3. Deduplicates solver currencies by address (case-insensitive)
 * 4. Drops chains with no assets
 */
export function parseRelayChainsResponse(data: unknown): NetworkAssets[] {
    const { chains } = RelayChainsResponseSchema.parse(data);

    const evmChains = chains
        .filter((c) => (!c.vmType || c.vmType === "evm") && !c.disabled)
        .map((c) => ({ id: c.id, solverCurrencies: c.solverCurrencies }));

    return toNetworkAssets(evmChains);
}

/**
 * Build NetworkAssets from chain solver currencies, deduplicating by address (case-insensitive).
 */
function toNetworkAssets(
    chains: { id: number; solverCurrencies: RelaySolverCurrency[] }[],
): NetworkAssets[] {
    return chains
        .map(({ id, solverCurrencies }) => {
            const seen = new Map<string, AssetInfo>();

            for (const currency of solverCurrencies) {
                const key = currency.address.toLowerCase();

                if (!seen.has(key)) {
                    seen.set(key, {
                        address: currency.address,
                        symbol: currency.symbol,
                        decimals: currency.decimals,
                    });
                }
            }

            return { chainId: id, assets: Array.from(seen.values()) };
        })
        .filter(({ assets }) => assets.length > 0);
}
