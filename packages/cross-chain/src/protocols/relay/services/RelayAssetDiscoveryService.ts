import type { Address } from "viem";
import { encodeAddress } from "@wonderland/interop-addresses";
import axios from "axios";
import { ZodError } from "zod";

import type { AssetInfo, NetworkAssets } from "../../../core/types/assetDiscovery.js";
import type { RelayCurrencyEntry } from "../schemas.js";
import { AssetDiscoveryFailure } from "../../../core/errors/AssetDiscoveryFailure.exception.js";
import {
    BaseAssetDiscoveryService,
    BaseAssetDiscoveryServiceConfig,
} from "../../../core/services/BaseAssetDiscoveryService.js";
import { RelayChainsResponseSchema, RelayCurrenciesResponseSchema } from "../schemas.js";

/** Maximum number of verified tokens to request per chain. */
const CURRENCIES_LIMIT = 100;

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
 * Discovers supported tokens via the Relay API in two steps:
 *
 * 1. `GET /chains` — list all EVM chain IDs (~74 chains)
 * 2. `POST /currencies/v2` per chain — fetch up to 100 tokens each
 *
 * The `/currencies/v2` endpoint caps results at 100 per request (global, not
 * per-chain), so per-chain requests are required for full coverage (~1 100+
 * tokens across 74 chains vs 100 from a single multi-chain call).
 *
 * All per-chain requests fire in parallel. The Relay API allows 200 req/min
 * on non-quote endpoints, so ~75 concurrent requests fit comfortably.
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
     * 1. GET /chains → extract EVM chain IDs
     * 2. POST /currencies/v2 per chain (all in parallel)
     * 3. Group by chain, deduplicate by address, encode to EIP-7930
     */
    protected async fetchAssets(): Promise<NetworkAssets[]> {
        const chainIds = await this.fetchEvmChainIds();

        if (chainIds.length === 0) {
            return [];
        }

        const currencies = await this.fetchCurrencies(chainIds);
        return this.toNetworkAssets(currencies);
    }

    /**
     * GET /chains → EVM chain IDs.
     *
     * Filters to chains where `vmType` is `"evm"` or undefined (legacy entries
     * before Relay added the field default to EVM).
     */
    private async fetchEvmChainIds(): Promise<number[]> {
        try {
            const { data } = await axios.get(`${this.baseUrl}/chains`, {
                headers: this.headers,
                timeout: this.timeout,
            });

            const { chains } = RelayChainsResponseSchema.parse(data);

            return chains.filter((c) => !c.vmType || c.vmType === "evm").map((c) => c.id);
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
     * POST /currencies/v2 for every chain in parallel.
     *
     * Individual chain failures are silently dropped — a single chain timing
     * out should not prevent the rest from being discovered.
     */
    private async fetchCurrencies(chainIds: number[]): Promise<RelayCurrencyEntry[]> {
        const settled = await Promise.allSettled(
            chainIds.map((id) => this.fetchCurrenciesForChain(id)),
        );

        return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    }

    /**
     * Fetch EVM currencies for a single chain (verified + unverified).
     */
    private async fetchCurrenciesForChain(chainId: number): Promise<RelayCurrencyEntry[]> {
        const { data } = await axios.post(
            `${this.baseUrl}/currencies/v2`,
            { chainIds: [chainId], limit: CURRENCIES_LIMIT },
            { headers: this.headers, timeout: this.timeout },
        );

        return RelayCurrenciesResponseSchema.parse(data).filter(
            (c) => !c.vmType || c.vmType === "evm",
        );
    }

    /**
     * Group currency entries by chain, deduplicate by address (case-insensitive),
     * and encode each address to EIP-7930 interop format.
     */
    private toNetworkAssets(currencies: RelayCurrencyEntry[]): NetworkAssets[] {
        const chainMap = new Map<number, Map<string, AssetInfo>>();

        for (const currency of currencies) {
            const key = currency.address.toLowerCase();
            let assets = chainMap.get(currency.chainId);

            if (!assets) {
                assets = new Map();
                chainMap.set(currency.chainId, assets);
            }

            if (!assets.has(key)) {
                assets.set(key, {
                    address: encodeAddress(
                        {
                            version: 1,
                            chainType: "eip155",
                            chainReference: currency.chainId.toString(),
                            address: currency.address as Address,
                        },
                        { format: "hex" },
                    ) as Address,
                    symbol: currency.symbol,
                    decimals: currency.decimals,
                });
            }
        }

        return Array.from(chainMap.entries()).map(([chainId, assets]) => ({
            chainId,
            assets: Array.from(assets.values()),
        }));
    }
}
