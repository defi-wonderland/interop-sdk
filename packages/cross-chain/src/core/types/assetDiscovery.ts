/**
 * Asset Discovery Types
 *
 * Types for discovering supported assets and chains from providers.
 * Based on OIF Spec PR 31: https://github.com/openintentsframework/oif-specs/pull/31
 *
 * The OIF standard defines:
 * - GET /api/tokens - Returns all supported networks and their assets
 * - GET /api/tokens/{chain_id} - Returns assets for a specific chain
 */

/**
 * Asset metadata information
 *
 * @example
 * {
 *   address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
 *   symbol: "USDC",
 *   decimals: 6
 * }
 */
export interface AssetInfo {
    /** Asset address in plain 0x format */
    address: string;
    /** Human-readable asset symbol */
    symbol: string;
    /** Number of decimal places for the asset */
    decimals: number;
}

/**
 * Network asset configuration
 */
export interface NetworkAssets {
    /** Blockchain network identifier */
    chainId: number;
    /** List of supported assets */
    assets: AssetInfo[];
}

/**
 * Response from GET /api/tokens endpoint
 * @note The API returns snake_case (chain_id), but the SDK transforms to camelCase (chainId).
 */
export interface GetAssetsResponse {
    /** Map of network configurations keyed by chain ID */
    networks: Record<string, NetworkAssets>;
}

/**
 * Options for asset discovery queries
 */
export interface AssetDiscoveryOptions {
    /** Filter by chain ID(s) */
    chainIds?: number[];
}

/**
 * Result from asset discovery
 */
export interface AssetDiscoveryResult {
    /** Supported networks with their assets */
    networks: NetworkAssets[];
    /** Provider ID that returned this data */
    providerId: string;
}

/**
 * Asset info enriched with provider attribution.
 *
 * Extends AssetInfo with a `providers` array that lists which provider IDs
 * reported this asset. Useful for knowing which bridges/solvers can handle
 * a particular token.
 */
export interface DiscoveredAssetInfo extends AssetInfo {
    /** Provider IDs that reported this asset */
    providers: string[];
}

/**
 * Aggregated view of discovered assets from one or more providers,
 * indexed for fast lookup by chain and address.
 *
 * Chain keys are numeric chain IDs (e.g. `1`, `42161`).
 * All addresses use plain `0x` format.
 *
 * Token metadata is nested by chain ID to prevent cross-chain address
 * collisions (the same contract address can exist on multiple chains).
 */
export interface DiscoveredAssets {
    /** Token addresses grouped by numeric chain ID */
    tokensByChain: Record<number, readonly string[]>;
    /** Token metadata nested by chain ID then lowercase address, with provider attribution */
    tokenMetadata: Record<number, Record<string, DiscoveredAssetInfo>>;
}

/**
 * Query parameters for finding providers that support a specific route.
 */
export interface RouteQuery {
    /** Origin chain ID */
    originChainId: number;
    /** Origin asset address in plain 0x format */
    originAsset: string;
    /** Destination chain ID */
    destinationChainId: number;
    /** Destination asset address in plain 0x format */
    destinationAsset: string;
}
