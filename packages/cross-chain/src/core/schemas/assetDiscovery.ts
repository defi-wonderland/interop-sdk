/**
 * Asset Discovery Zod Schemas
 *
 * Validation schemas for OIF asset discovery API responses.
 * Based on OIF Spec PR 31: https://github.com/openintentsframework/oif-specs/pull/31
 *
 * @note The API returns snake_case (chain_id), but the SDK transforms to camelCase (chainId).
 */

import { z } from "zod";

import { AddressSchema } from "./address.js";

/**
 * Schema for asset metadata
 */
export const assetInfoSchema = z.object({
    address: AddressSchema.describe(
        "Asset address in EIP-7930 interoperable format for cross-chain compatibility.\nAll addresses are formatted with the 0x prefix.",
    ),
    symbol: z.string().describe('Asset symbol for display purposes (e.g., "USDC", "WETH", "USDT")'),
    decimals: z
        .number()
        .int()
        .min(0)
        .max(255)
        .describe("Asset decimal precision (e.g., 6 for USDC, 18 for WETH)"),
});

/**
 * Raw API schema for network assets (snake_case from API)
 */
const networkAssetsRawSchema = z.object({
    chain_id: z
        .number()
        .int()
        .positive()
        .describe(
            "Chain ID for the blockchain network (e.g., 1 for Ethereum, 137 for Polygon, 42161 for Arbitrum)",
        ),
    assets: z.array(assetInfoSchema).describe("Array of assets supported on this network"),
});

/**
 * Schema for network assets configuration (transforms to camelCase)
 */
export const networkAssetsSchema = networkAssetsRawSchema.transform((data) => ({
    chainId: data.chain_id,
    assets: data.assets,
}));

/**
 * Schema for GET /api/tokens response (transforms to camelCase)
 */
export const getAssetsResponseSchema = z
    .object({
        networks: z
            .record(
                networkAssetsRawSchema.describe(
                    'Map where keys are chain IDs as strings (e.g., "1", "137", "42161") and\nvalues are network asset configurations',
                ),
            )
            .describe(
                'Map where keys are chain IDs as strings (e.g., "1", "137", "42161") and\nvalues are network asset configurations',
            ),
    })
    .transform((data) => ({
        networks: Object.fromEntries(
            Object.entries(data.networks).map(([key, value]) => [
                key,
                { chainId: value.chain_id, assets: value.assets },
            ]),
        ),
    }));

/**
 * Schema for asset discovery options
 */
export const assetDiscoveryOptionsSchema = z.object({
    chainIds: z.array(z.number().int().positive()).optional(),
});

// Type exports from schemas
export type AssetInfoSchema = z.infer<typeof assetInfoSchema>;
export type NetworkAssetsSchema = z.infer<typeof networkAssetsSchema>;
export type GetAssetsResponseSchema = z.infer<typeof getAssetsResponseSchema>;
