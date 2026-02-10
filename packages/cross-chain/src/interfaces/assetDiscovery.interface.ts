/**
 * Asset Discovery Interfaces
 *
 * Defines the configuration and service interfaces for asset discovery.
 * Follows the same discriminated union pattern as OpenedIntentParserConfig.
 */

import type {
    AssetDiscoveryOptions,
    AssetInfo,
    DiscoveredAssets,
    NetworkAssets,
} from "../types/assetDiscovery.js";

/**
 * Interface for asset discovery services
 */
export interface AssetDiscoveryService {
    /**
     * Get all supported assets across all chains
     *
     * Returns a pre-processed DiscoveredAssets structure with:
     * - tokensByChain: CAIP-2 chain keys → EIP-7930 token addresses
     * - tokenMetadata: flat lookup by interop address → AssetInfo
     * - chainIds: sorted CAIP-2 identifiers
     *
     * @param options - Discovery options (filtering, caching)
     * @returns Aggregated discovery result ready for consumption
     */
    getSupportedAssets(options?: AssetDiscoveryOptions): Promise<DiscoveredAssets>;
    /**
     * Get supported assets for a specific chain
     *
     * @param chainId - Chain ID to get assets for
     * @param options - Discovery options
     * @returns Network assets for the specified chain, or null if not supported
     */
    getAssetsForChain(
        chainId: number,
        options?: AssetDiscoveryOptions,
    ): Promise<NetworkAssets | null>;
    /**
     * Check if a specific asset is supported
     *
     * @param chainId - Chain ID where the asset exists
     * @param assetAddress - Asset address (EIP-7930 format)
     * @param options - Discovery options
     * @returns Asset info if supported, null otherwise
     */
    isAssetSupported(
        chainId: number,
        assetAddress: string,
        options?: AssetDiscoveryOptions,
    ): Promise<AssetInfo | null>;
    /**
     * Get the list of supported chain IDs
     *
     * @param options - Discovery options
     * @returns Array of supported chain IDs
     */
    getSupportedChainIds(options?: AssetDiscoveryOptions): Promise<number[]>;
}

// ============ Configuration Types ============

/**
 * Shared configuration fields for API-based asset discovery services
 */
export interface BaseApiDiscoveryConfig {
    /** Optional custom headers for API requests */
    headers?: Record<string, string>;
    /**
     * Cache TTL in milliseconds.
     * Asset lists rarely change, so the default is Infinity (cache never expires).
     * Use `forceRefresh: true` to explicitly refresh when needed.
     * @default Infinity
     */
    cacheTtl?: number;
    /**
     * Request timeout in milliseconds
     * @default 30000 (30 seconds)
     */
    timeout?: number;
}

/**
 * Configuration for OIF standard asset discovery
 *
 * Uses the standard OIF API endpoint: GET /api/tokens
 */
export interface OIFAssetDiscoveryConfig {
    type: "oif";
    config: BaseApiDiscoveryConfig & {
        /** Base URL of the OIF-compliant solver API */
        baseUrl: string;
    };
}

/**
 * Configuration for custom API-based asset discovery
 *
 * Used by protocols that have their own discovery endpoints (e.g., Across)
 */
export interface CustomApiAssetDiscoveryConfig {
    type: "custom-api";
    config: BaseApiDiscoveryConfig & {
        /** Endpoint URL for fetching all assets */
        assetsEndpoint: string;
        /** Function to transform API response to SDK types */
        parseResponse: (data: unknown) => NetworkAssets[];
    };
}

/**
 * Configuration for static asset discovery
 */
export interface StaticAssetDiscoveryConfig {
    type: "static";
    config: {
        /** Static list of network assets */
        networks: NetworkAssets[];
    };
}

/**
 * Discriminated union for asset discovery configuration
 */
export type AssetDiscoveryConfig =
    | OIFAssetDiscoveryConfig
    | CustomApiAssetDiscoveryConfig
    | StaticAssetDiscoveryConfig;
