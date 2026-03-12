import axios from "axios";
import { ZodError } from "zod";

import type { AssetInfo, NetworkAssets } from "../../../core/types/assetDiscovery.js";
import type { RelaySolverCurrency } from "../schemas.js";
import { AssetDiscoveryFailure } from "../../../core/errors/AssetDiscoveryFailure.exception.js";
import {
    BaseAssetDiscoveryService,
    BaseAssetDiscoveryServiceConfig,
} from "../../../core/services/BaseAssetDiscoveryService.js";
import { RelayChainsResponseSchema } from "../schemas.js";

/**
 * Configuration for the Relay Asset Discovery Service
 */
export interface RelayAssetDiscoveryServiceConfig extends BaseAssetDiscoveryServiceConfig {
    /** Relay API base URL (e.g. "https://api.relay.link") */
    baseUrl: string;
}

/**
 * Relay Asset Discovery Service
 *
 * Discovers supported tokens via the Relay API in a single step:
 *
 * `GET /chains` — list all EVM chains with their `solverCurrencies`
 *
 * Each chain object includes a `solverCurrencies` array with the tokens
 * that Relay solvers can fill, so a single request covers all chains.
 *
 * Results are cached permanently by {@link BaseAssetDiscoveryService} — only
 * one round-trip ever happens per service instance.
 */
export class RelayAssetDiscoveryService extends BaseAssetDiscoveryService {
    private readonly baseUrl: string;

    constructor(config: RelayAssetDiscoveryServiceConfig) {
        super(config);
        this.baseUrl = config.baseUrl.replace(/\/$/, "");
    }

    /**
     * Fetch all supported assets from the Relay API.
     *
     * 1. GET /chains → extract EVM chains with solverCurrencies
     * 2. Group by chain, deduplicate by address
     */
    protected async fetchAssets(): Promise<NetworkAssets[]> {
        const chains = await this.fetchEvmChains();

        if (chains.length === 0) {
            return [];
        }

        return this.toNetworkAssets(chains);
    }

    /**
     * GET /chains → EVM chains with solver currencies.
     *
     * Filters to chains where `vmType` is `"evm"` or undefined (legacy entries
     * before Relay added the field default to EVM).
     */
    private async fetchEvmChains(): Promise<
        { id: number; solverCurrencies: RelaySolverCurrency[] }[]
    > {
        try {
            const { data } = await axios.get(`${this.baseUrl}/chains`, {
                headers: this.headers,
                timeout: this.timeout,
            });

            const { chains } = RelayChainsResponseSchema.parse(data);

            return chains
                .filter((c) => !c.vmType || c.vmType === "evm")
                .map((c) => ({ id: c.id, solverCurrencies: c.solverCurrencies }));
        } catch (error) {
            if (error instanceof ZodError) {
                throw new AssetDiscoveryFailure(
                    "Failed to validate Relay chains response",
                    error.message,
                    error.stack,
                );
            }
            throw error;
        }
    }

    /**
     * Build NetworkAssets from chain solver currencies, deduplicating by address (case-insensitive).
     */
    private toNetworkAssets(
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
}
