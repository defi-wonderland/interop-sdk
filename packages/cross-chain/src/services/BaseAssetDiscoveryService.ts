import { AxiosError } from "axios";

import { AssetDiscoveryFailure } from "../errors/AssetDiscoveryFailure.exception.js";
import { AssetDiscoveryService } from "../interfaces/assetDiscovery.interface.js";
import {
    AssetDiscoveryOptions,
    AssetDiscoveryResult,
    AssetInfo,
    DiscoveredAssets,
    NetworkAssets,
} from "../types/assetDiscovery.js";
import { toDiscoveredAssets } from "../utils/toDiscoveredAssets.js";

/**
 * Shared configuration for all asset discovery services
 */
export interface BaseAssetDiscoveryServiceConfig {
    /** Provider ID for attribution */
    providerId: string;
    /** Optional custom headers for API requests */
    headers?: Record<string, string>;
    /**
     * Request timeout in milliseconds
     * @default 30000 (30 seconds)
     */
    timeout?: number;
}

/**
 * Abstract base class for asset discovery services.
 *
 * Owns all shared behavior: permanent caching, in-flight request deduplication,
 * chain filtering, and convenience query methods. Asset lists are fetched once
 * and cached forever — call `prefetch()` to start loading eagerly.
 *
 * Subclasses only need to implement `fetchAssets()` to define how data
 * is fetched and transformed from their specific source.
 */
export abstract class BaseAssetDiscoveryService implements AssetDiscoveryService {
    protected readonly providerId: string;
    protected readonly headers?: Record<string, string>;
    protected readonly timeout: number;

    private cache: AssetDiscoveryResult | null = null;
    private inFlight: Promise<AssetDiscoveryResult> | null = null;

    static readonly DEFAULT_TIMEOUT = 30_000;

    constructor(config: BaseAssetDiscoveryServiceConfig) {
        this.providerId = config.providerId;
        this.headers = config.headers;
        this.timeout = config.timeout ?? BaseAssetDiscoveryService.DEFAULT_TIMEOUT;
    }

    /**
     * Fetch assets from the remote source.
     *
     * Called by the base when the cache is cold and no in-flight
     * request exists.
     *
     * @param timeout - Request timeout in milliseconds
     * @returns The full, unfiltered discovery result
     * @throws AssetDiscoveryFailure on any fetch or parse error
     */
    protected abstract fetchAssets(timeout: number): Promise<AssetDiscoveryResult>;

    /**
     * Start fetching assets eagerly (fire-and-forget).
     *
     * If the cache is already populated or a request is in flight, this is a no-op.
     * Call this right after construction so data is ready by the time
     * `getSupportedAssets()` or any other query method is called.
     */
    prefetch(): void {
        if (this.cache || this.inFlight) return;
        this.resolveResult().catch(() => {});
    }

    /**
     * Get all supported assets across all chains
     *
     * Returns a pre-processed DiscoveredAssets structure ready for consumption.
     */
    async getSupportedAssets(options?: AssetDiscoveryOptions): Promise<DiscoveredAssets> {
        const result = await this.resolveResult();
        return toDiscoveredAssets([result], options?.chainIds);
    }

    /**
     * Get supported assets for a specific chain
     */
    async getAssetsForChain(
        chainId: number,
        options?: AssetDiscoveryOptions,
    ): Promise<NetworkAssets | null> {
        const rawResult = await this.getRawResult(options);
        return rawResult.networks.find((n) => n.chainId === chainId) ?? null;
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
        const rawResult = await this.getRawResult(options);
        return rawResult.networks.map((n) => n.chainId);
    }

    /**
     * Get raw discovery result (internal use for helper methods)
     */
    private async getRawResult(options?: AssetDiscoveryOptions): Promise<AssetDiscoveryResult> {
        const result = await this.resolveResult();
        return this.applyFilter(result, options?.chainIds);
    }

    /**
     * Single shared fetch path that manages cache and in-flight deduplication.
     * Both getSupportedAssets and getRawResult delegate here so only one
     * code path ever creates/clears this.inFlight.
     *
     * Acts as the centralized error boundary: any error not already wrapped
     * by a subclass is caught here and turned into an AssetDiscoveryFailure
     * with provider attribution via {@link wrapError}.
     */
    private async resolveResult(): Promise<AssetDiscoveryResult> {
        if (this.cache) {
            return this.cache;
        }

        if (this.inFlight) {
            return this.inFlight;
        }

        const promise = this.fetchAssets(this.timeout)
            .then((result) => {
                this.cache = result;
                return result;
            })
            .catch((error: unknown) => {
                const url =
                    error instanceof AxiosError ? (error.config?.url ?? "unknown") : "unknown";
                throw this.wrapError(error, url);
            });

        this.inFlight = promise;

        promise
            .finally(() => {
                if (this.inFlight === promise) {
                    this.inFlight = null;
                }
            })
            .catch(() => {});

        return promise;
    }

    private applyFilter(result: AssetDiscoveryResult, chainIds?: number[]): AssetDiscoveryResult {
        if (!chainIds?.length) return result;

        const chainIdSet = new Set(chainIds);
        return {
            ...result,
            networks: result.networks.filter((n) => chainIdSet.has(n.chainId)),
        };
    }

    /**
     * Wrap an unknown error into a consistent AssetDiscoveryFailure.
     * Handles AxiosError (timeout, rate limit, response message extraction)
     * and generic errors uniformly.
     *
     * Called by {@link resolveResult} as the centralized safety net so that
     * consumers always receive an AssetDiscoveryFailure regardless of what
     * the subclass throws.
     */
    private wrapError(error: unknown, url: string): AssetDiscoveryFailure {
        if (error instanceof AssetDiscoveryFailure) {
            return error;
        }

        if (error instanceof AxiosError) {
            if (error.code === "ECONNABORTED") {
                return new AssetDiscoveryFailure(
                    `Request to ${this.providerId} timed out`,
                    `Timeout after ${this.timeout}ms. URL: ${url}`,
                    error.stack,
                );
            }

            if (error.response?.status === 429) {
                return new AssetDiscoveryFailure(
                    `${this.providerId} rate limit exceeded`,
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
                `Failed to fetch assets from ${this.providerId}`,
                `${baseMessage}. URL: ${url}`,
                error.stack,
            );
        }

        return new AssetDiscoveryFailure(
            `Failed to fetch assets from ${this.providerId}`,
            `${String(error)}. URL: ${url}`,
            error instanceof Error ? error.stack : undefined,
        );
    }
}
