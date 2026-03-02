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
import type { ChainIdentifier } from "@wonderland/interop-addresses";

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
 * indexed for fast lookup by chain and interop address.
 *
 * Chain keys use CAIP-350 format (e.g. "eip155:1", "eip155:42161").
 * All addresses use the EIP-7930 interop format.
 *
 * Use `toChainIdentifier(chainId)` from `@wonderland/interop-addresses` to
 * convert a numeric chain ID to a CAIP-350 identifier.
 * Use `decodeAddress` from `@wonderland/interop-addresses` to get the
 * plain address when needed for display or wallet interaction.
 */
export interface DiscoveredAssets {
    /** Token interop addresses grouped by CAIP-350 chain identifier */
    tokensByChain: Record<ChainIdentifier, readonly Address[]>;
    /** Token metadata keyed by interop address (globally unique), with provider attribution */
    tokenMetadata: Record<Address, DiscoveredAssetInfo>;
}

/**
 * Query parameters for finding providers that support a specific route.
 *
 * Both addresses use EIP-7930 interop format, which encodes the chain ID
 * inside the address itself -- so only two params are needed.
 */
export interface RouteQuery {
    /** Origin asset in EIP-7930 interop address format */
    originAsset: Address;
    /** Destination asset in EIP-7930 interop address format */
    destinationAsset: Address;
}
