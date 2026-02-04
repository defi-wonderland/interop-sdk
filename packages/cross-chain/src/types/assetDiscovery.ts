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

import type { Address } from "@openintentsframework/oif-specs";

/**
 * Asset metadata information
 *
 * @example
 * {
 *   address: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum (EIP-7930)
 *   symbol: "USDC",
 *   decimals: 6
 * }
 */
export interface AssetInfo {
    /** Asset address in EIP-7930 interoperable format */
    address: Address;
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
    /** Force refresh even if cached */
    forceRefresh?: boolean;
    /** Request timeout in milliseconds */
    timeout?: number;
}

/**
 * Result from asset discovery
 */
export interface AssetDiscoveryResult {
    /** Supported networks with their assets */
    networks: NetworkAssets[];
    /** When this data was fetched (Unix timestamp in milliseconds) */
    fetchedAt: number;
    /** Provider ID that returned this data */
    providerId: string;
}
