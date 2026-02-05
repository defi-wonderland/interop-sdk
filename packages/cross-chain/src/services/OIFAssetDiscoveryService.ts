/**
 * OIF Asset Discovery Service
 *
 * Implements asset discovery using the OIF standard API endpoint.
 * Based on OIF Spec PR 31: https://github.com/openintentsframework/oif-specs/pull/31
 *
 * Endpoints:
 * - GET /api/tokens - Returns all supported networks and their assets
 * - GET /api/tokens/{chain_id} - Returns assets for a specific chain
 */

import axios, { AxiosError } from "axios";
import { ZodError } from "zod";

import {
    AssetDiscoveryFailure,
    AssetDiscoveryOptions,
    AssetDiscoveryResult,
    AssetDiscoveryService,
    AssetInfo,
    getAssetsResponseSchema,
    NetworkAssets,
} from "../internal.js";

/**
 * Configuration for OIF Asset Discovery Service
 */
export interface OIFAssetDiscoveryServiceConfig {
    /**
     * Base URL of the OIF-compliant solver API
     * @example "https://api.solver.com"
     */
    baseUrl: string;
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
}

/**
 * Cache entry for asset discovery
 */
interface CacheEntry {
    data: AssetDiscoveryResult;
    expiresAt: number;
}

/**
 * OIF Asset Discovery Service Implementation
 *
 * Fetches supported assets from OIF-compliant solvers using the standard
 * /api/tokens endpoint. Includes in-memory caching with configurable TTL.
 */
export class OIFAssetDiscoveryService implements AssetDiscoveryService {
    private readonly baseUrl: string;
    private readonly providerId: string;
    private readonly headers?: Record<string, string>;
    private readonly cacheTtl: number;
    private cache: CacheEntry | null = null;

    /**
     * Default cache TTL: 5 minutes
     */
    private static readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000;

    /**
     * Default request timeout: 30 seconds
     */
    private static readonly DEFAULT_TIMEOUT = 30000;

    constructor(config: OIFAssetDiscoveryServiceConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
        this.providerId = config.providerId;
        this.headers = config.headers;
        this.cacheTtl = config.cacheTtl ?? OIFAssetDiscoveryService.DEFAULT_CACHE_TTL;
    }

    /**
     * Get all supported assets across all chains
     */
    async getSupportedAssets(options?: AssetDiscoveryOptions): Promise<AssetDiscoveryResult> {
        // Check cache first (unless forceRefresh)
        if (!options?.forceRefresh && this.isCacheValid()) {
            const cached = this.cache!.data;

            // Apply chain filter if provided
            if (options?.chainIds?.length) {
                return this.filterByChains(cached, options.chainIds);
            }

            return cached;
        }

        // Fetch from API
        const result = await this.fetchAssets(options?.timeout);

        // Update cache
        this.cache = {
            data: result,
            expiresAt: Date.now() + this.cacheTtl,
        };

        // Apply chain filter if provided
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

        // Normalize address for comparison (case-insensitive)
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
     * Fetch assets from the OIF API
     */
    private async fetchAssets(timeout?: number): Promise<AssetDiscoveryResult> {
        const requestTimeout = timeout ?? OIFAssetDiscoveryService.DEFAULT_TIMEOUT;

        try {
            const response = await axios.get(`${this.baseUrl}/api/tokens`, {
                headers: {
                    "Content-Type": "application/json",
                    ...this.headers,
                },
                timeout: requestTimeout,
            });

            if (response.status !== 200) {
                throw new AssetDiscoveryFailure(
                    "Failed to fetch assets from OIF API",
                    `Unexpected status code: ${response.status}. URL: ${this.baseUrl}/api/tokens`,
                );
            }

            // Validate response against schema
            const validated = getAssetsResponseSchema.parse(response.data);

            // Convert from Record<string, NetworkAssets> to NetworkAssets[]
            const networks = Object.values(validated.networks);

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
                const errorData = error.response?.data as { message?: string } | undefined;
                const baseMessage =
                    errorData?.message ||
                    (error.cause as Error | undefined)?.message ||
                    error.message ||
                    "Failed to fetch assets";

                throw new AssetDiscoveryFailure(
                    "Failed to fetch assets from OIF API",
                    `${baseMessage}. URL: ${this.baseUrl}/api/tokens`,
                    error.stack,
                );
            }

            if (error instanceof ZodError) {
                throw new AssetDiscoveryFailure(
                    "Failed to validate OIF asset discovery response",
                    error.message,
                    error.stack,
                );
            }

            throw new AssetDiscoveryFailure(
                "Failed to fetch assets from OIF API",
                String(error),
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
