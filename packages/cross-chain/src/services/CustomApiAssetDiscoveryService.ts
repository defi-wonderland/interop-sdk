/**
 * Custom API Asset Discovery Service
 *
 * Implements asset discovery using custom API endpoints.
 * This is a generic service that accepts a parseResponse function to transform
 * protocol-specific API responses into the SDK's NetworkAssets format.
 *
 * Used by protocols like Across that have their own discovery endpoints.
 */

import axios, { AxiosError } from "axios";

import {
    AssetDiscoveryFailure,
    AssetDiscoveryOptions,
    AssetDiscoveryResult,
    AssetDiscoveryService,
    AssetInfo,
    NetworkAssets,
} from "../internal.js";

/**
 * Configuration for Custom API Asset Discovery Service
 */
export interface CustomApiAssetDiscoveryServiceConfig {
    /**
     * Endpoint URL for fetching all assets
     */
    assetsEndpoint: string;
    /**
     * Function to transform API response to SDK types
     * This function should throw on invalid data (e.g., ZodError)
     */
    parseResponse: (data: unknown) => NetworkAssets[];
    /**
     * Provider ID for attribution
     */
    providerId: string;
    /**
     * Optional custom headers for API requests
     */
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
 * Custom API Asset Discovery Service Implementation
 *
 * Fetches supported assets from custom API endpoints and transforms them
 * using a protocol-specific parseResponse function.
 * Includes in-memory caching with configurable TTL.
 */
export class CustomApiAssetDiscoveryService implements AssetDiscoveryService {
    private readonly assetsEndpoint: string;
    private readonly parseResponse: (data: unknown) => NetworkAssets[];
    private readonly providerId: string;
    private readonly headers?: Record<string, string>;
    private readonly cacheTtl: number;
    private readonly timeout: number;
    private cache: CacheEntry | null = null;

    /**
     * Default cache TTL: 5 minutes
     */
    private static readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000;

    /**
     * Default request timeout: 30 seconds
     */
    private static readonly DEFAULT_TIMEOUT = 30000;

    constructor(config: CustomApiAssetDiscoveryServiceConfig) {
        this.assetsEndpoint = config.assetsEndpoint;
        this.parseResponse = config.parseResponse;
        this.providerId = config.providerId;
        this.headers = config.headers;
        this.cacheTtl = config.cacheTtl ?? CustomApiAssetDiscoveryService.DEFAULT_CACHE_TTL;
        this.timeout = config.timeout ?? CustomApiAssetDiscoveryService.DEFAULT_TIMEOUT;
    }

    /**
     * Get all supported assets across all chains
     */
    async getSupportedAssets(options?: AssetDiscoveryOptions): Promise<AssetDiscoveryResult> {
        if (!options?.forceRefresh && this.isCacheValid()) {
            const cached = this.cache!.data;
            if (options?.chainIds?.length) {
                return this.filterByChains(cached, options.chainIds);
            }
            return cached;
        }

        const result = await this.fetchAssets(options?.timeout);

        this.cache = {
            data: result,
            expiresAt: Date.now() + this.cacheTtl,
        };

        if (options?.chainIds?.length) {
            return this.filterByChains(result, options.chainIds);
        }

        return result;
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

        if (!network) {
            return null;
        }

        const normalizedAddress = assetAddress.toLowerCase();

        return (
            network.assets.find((asset) => asset.address.toLowerCase() === normalizedAddress) ??
            null
        );
    }

    /**
     * Get the list of supported chain IDs
     */
    async getSupportedChainIds(options?: AssetDiscoveryOptions): Promise<number[]> {
        const result = await this.getSupportedAssets(options);
        return result.networks.map((n) => n.chainId);
    }

    /**
     * Check if cache is valid
     */
    private isCacheValid(): boolean {
        return this.cache !== null && Date.now() < this.cache.expiresAt;
    }

    /**
     * Filter result by chain IDs
     */
    private filterByChains(result: AssetDiscoveryResult, chainIds: number[]): AssetDiscoveryResult {
        const chainIdSet = new Set(chainIds);
        return {
            ...result,
            networks: result.networks.filter((n) => chainIdSet.has(n.chainId)),
        };
    }

    /**
     * Fetch assets from the custom API
     */
    private async fetchAssets(timeout?: number): Promise<AssetDiscoveryResult> {
        const requestTimeout = timeout ?? this.timeout;

        try {
            const response = await axios.get(this.assetsEndpoint, {
                headers: {
                    "Content-Type": "application/json",
                    ...this.headers,
                },
                timeout: requestTimeout,
            });

            if (response.status !== 200) {
                throw new AssetDiscoveryFailure(
                    "Failed to fetch assets from custom API",
                    `Unexpected status code: ${response.status}. URL: ${this.assetsEndpoint}`,
                );
            }

            const networks = this.parseResponse(response.data);

            return {
                networks,
                fetchedAt: Date.now(),
                providerId: this.providerId,
            };
        } catch (error) {
            if (error instanceof AssetDiscoveryFailure) {
                throw error;
            }

            if (error instanceof AxiosError) {
                if (error.code === "ECONNABORTED") {
                    throw new AssetDiscoveryFailure(
                        "Request to custom API timed out",
                        `Timeout after ${requestTimeout}ms. URL: ${this.assetsEndpoint}`,
                        error.stack,
                    );
                }

                if (error.response?.status === 429) {
                    throw new AssetDiscoveryFailure(
                        "Custom API rate limit exceeded",
                        `Rate limited at ${this.assetsEndpoint}`,
                        error.stack,
                    );
                }

                const errorData = error.response?.data as { message?: string } | undefined;
                const baseMessage =
                    errorData?.message ||
                    (error.cause as Error | undefined)?.message ||
                    error.message ||
                    "Failed to fetch assets";

                throw new AssetDiscoveryFailure(
                    "Failed to fetch assets from custom API",
                    `${baseMessage}. URL: ${this.assetsEndpoint}`,
                    error.stack,
                );
            }

            throw new AssetDiscoveryFailure(
                "Failed to parse custom API response",
                `Error at ${this.assetsEndpoint}: ${String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * Clear the cache (useful for testing)
     */
    clearCache(): void {
        this.cache = null;
    }
}
