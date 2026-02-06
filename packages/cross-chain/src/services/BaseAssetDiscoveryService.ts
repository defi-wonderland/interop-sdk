import { AxiosError } from "axios";

import { AssetDiscoveryFailure } from "../errors/AssetDiscoveryFailure.exception.js";
import { AssetDiscoveryService } from "../interfaces/assetDiscovery.interface.js";
import {
    AssetDiscoveryOptions,
    AssetDiscoveryResult,
    AssetInfo,
    NetworkAssets,
} from "../types/assetDiscovery.js";

/**
 * Shared configuration for all asset discovery services
 */
export interface BaseAssetDiscoveryServiceConfig {
    /** Provider ID for attribution */
    providerId: string;
    /** Optional custom headers for API requests */
    headers?: Record<string, string>;
    /**
     * Cache TTL in milliseconds
     * @default 300000 (5 minutes)
     */
    cacheTtl?: number;
    /**
     * Request timeout in milliseconds
     * @default 30000 (30 seconds)
     */
    timeout?: number;
}

/**
 * Cache entry for asset discovery
 */
interface CacheEntry {
    data: AssetDiscoveryResult;
    expiresAt: number;
}

/**
 * Abstract base class for asset discovery services.
 *
 * Owns all shared behavior: TTL caching, in-flight request deduplication,
 * chain filtering, and convenience query methods.
 *
 * Subclasses only need to implement `fetchAssets()` to define how data
 * is fetched and transformed from their specific source.
 */
export abstract class BaseAssetDiscoveryService implements AssetDiscoveryService {
    protected readonly providerId: string;
    protected readonly headers?: Record<string, string>;
    protected readonly cacheTtl: number;
    protected readonly timeout: number;

    private cache: CacheEntry | null = null;
    private inFlight: Promise<AssetDiscoveryResult> | null = null;

    static readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000;
    static readonly DEFAULT_TIMEOUT = 30_000;

    constructor(config: BaseAssetDiscoveryServiceConfig) {
        this.providerId = config.providerId;
        this.headers = config.headers;
        this.cacheTtl = config.cacheTtl ?? BaseAssetDiscoveryService.DEFAULT_CACHE_TTL;
        this.timeout = config.timeout ?? BaseAssetDiscoveryService.DEFAULT_TIMEOUT;
    }

    /**
     * Fetch assets from the remote source.
     *
     * Called by the base when the cache is cold/expired and no in-flight
     * request exists.
     *
     * @param timeout - Request timeout in milliseconds
     * @returns The full, unfiltered discovery result
     * @throws AssetDiscoveryFailure on any fetch or parse error
     */
    protected abstract fetchAssets(timeout: number): Promise<AssetDiscoveryResult>;
    /**
     * Get all supported assets across all chains
     */
    async getSupportedAssets(options?: AssetDiscoveryOptions): Promise<AssetDiscoveryResult> {
        if (!options?.forceRefresh && this.isCacheValid()) {
            return this.applyFilter(this.cache!.data, options?.chainIds);
        }

        if (this.inFlight) {
            const result = await this.inFlight;
            return this.applyFilter(result, options?.chainIds);
        }

        const requestTimeout = options?.timeout ?? this.timeout;

        this.inFlight = this.fetchAssets(requestTimeout)
            .then((result) => {
                this.cache = {
                    data: result,
                    expiresAt: Date.now() + this.cacheTtl,
                };
                return result;
            })
            .finally(() => {
                this.inFlight = null;
            });

        const result = await this.inFlight;
        return this.applyFilter(result, options?.chainIds);
    }

    /**
     * Get supported assets for a specific chain
     */
    async getAssetsForChain(
        chainId: number,
        options?: AssetDiscoveryOptions,
    ): Promise<NetworkAssets | null> {
        const result = await this.getSupportedAssets({
            ...options,
            chainIds: [chainId],
        });
        return result.networks.find((n) => n.chainId === chainId) ?? null;
    }

    /**
     * Check if a specific asset is supported
     */
    async isAssetSupported(
        chainId: number,
        assetAddress: string,
        options?: AssetDiscoveryOptions,
    ): Promise<AssetInfo | null> {
        const network = await this.getAssetsForChain(chainId, options);
        if (!network) return null;

        const normalizedAddress = assetAddress.toLowerCase();
        return network.assets.find((a) => a.address.toLowerCase() === normalizedAddress) ?? null;
    }

    /**
     * Get the list of supported chain IDs
     */
    async getSupportedChainIds(options?: AssetDiscoveryOptions): Promise<number[]> {
        const result = await this.getSupportedAssets(options);
        return result.networks.map((n) => n.chainId);
    }

    /**
     * Clear the cache and any in-flight request reference
     */
    clearCache(): void {
        this.cache = null;
        this.inFlight = null;
    }

    /**
     * Wrap an unknown error into a consistent AssetDiscoveryFailure.
     * Handles AxiosError (timeout, rate limit, response message extraction)
     * and generic errors uniformly.
     *
     * @param error - The caught error
     * @param context - Human-readable context (e.g. "OIF API", "custom API")
     * @param url - The URL that was called (included in error details)
     * @param timeout - The actual timeout used for the request (for accurate error messages)
     */
    protected wrapError(
        error: unknown,
        context: string,
        url: string,
        timeout: number,
    ): AssetDiscoveryFailure {
        if (error instanceof AssetDiscoveryFailure) {
            return error;
        }

        if (error instanceof AxiosError) {
            if (error.code === "ECONNABORTED") {
                return new AssetDiscoveryFailure(
                    `Request to ${context} timed out`,
                    `Timeout after ${timeout}ms. URL: ${url}`,
                    error.stack,
                );
            }

            if (error.response?.status === 429) {
                return new AssetDiscoveryFailure(
                    `${context} rate limit exceeded`,
                    `Rate limited at ${url}`,
                    error.stack,
                );
            }

            const errorData = error.response?.data as { message?: string } | undefined;
            const baseMessage =
                errorData?.message ||
                (error.cause as Error | undefined)?.message ||
                error.message ||
                "Failed to fetch assets";

            return new AssetDiscoveryFailure(
                `Failed to fetch assets from ${context}`,
                `${baseMessage}. URL: ${url}`,
                error.stack,
            );
        }

        return new AssetDiscoveryFailure(
            `Failed to fetch assets from ${context}`,
            `${String(error)}. URL: ${url}`,
            error instanceof Error ? error.stack : undefined,
        );
    }

    private isCacheValid(): boolean {
        return this.cache !== null && Date.now() < this.cache.expiresAt;
    }

    private applyFilter(result: AssetDiscoveryResult, chainIds?: number[]): AssetDiscoveryResult {
        if (!chainIds?.length) return result;

        const chainIdSet = new Set(chainIds);
        return {
            ...result,
            networks: result.networks.filter((n) => chainIdSet.has(n.chainId)),
        };
    }
}
