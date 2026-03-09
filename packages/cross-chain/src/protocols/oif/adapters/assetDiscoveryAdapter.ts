/**
 * TEMPORARY — Aggregator workaround for missing GET /api/tokens
 * @see https://github.com/openintentsframework/oif-solver/issues/295
 */

import type { NetworkAssets } from "../../../core/types/assetDiscovery.js";

interface AggregatorSolverResponse {
    supportedAssets: {
        assets: { address: string; chainId: number; symbol: string; decimals: number }[];
    };
}

export function buildAggregatorSolverEndpoint(baseUrl: string, solverId: string): string {
    return `${baseUrl.replace(/\/$/, "")}/v1/solvers/${solverId}`;
}

export function parseAggregatorSolverResponse(data: unknown): NetworkAssets[] {
    const { supportedAssets } = data as AggregatorSolverResponse;
    const chains = new Map<number, NetworkAssets>();

    for (const asset of supportedAssets.assets) {
        let chain = chains.get(asset.chainId);
        if (!chain) {
            chain = { chainId: asset.chainId, assets: [] };
            chains.set(asset.chainId, chain);
        }

        if (chain.assets.some((a) => a.address.toLowerCase() === asset.address.toLowerCase())) {
            continue;
        }

        chain.assets.push({
            address: asset.address,
            symbol: asset.symbol,
            decimals: asset.decimals,
        });
    }

    return Array.from(chains.values());
}
