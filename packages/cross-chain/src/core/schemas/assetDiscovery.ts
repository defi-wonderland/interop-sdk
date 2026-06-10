/**
 * Asset Discovery Zod Schemas
 *
 * Validation schemas for OIF asset discovery API responses.
 * Based on OIF Spec PR 31: https://github.com/openintentsframework/oif-specs/pull/31
 *
 * @note The API returns snake_case (chain_id), but the SDK transforms to camelCase (chainId).
 */

import { z } from "zod";

import type { RouteQuery } from "../types/assetDiscovery.js";
import { HexAddressSchema } from "./address.js";
import { chainIdSchema } from "./common.js";

/**
 * Schema for asset metadata
 */
export const assetInfoSchema = z.object({
    address: HexAddressSchema.describe("Asset address in plain 0x format"),
    symbol: z.string().describe('Asset symbol for display purposes (e.g., "USDC", "WETH", "USDT")'),
    decimals: z
        .number()
        .int()
        .min(0)
        .max(255)
        .describe("Asset decimal precision (e.g., 6 for USDC, 18 for WETH)"),
    name: z
        .string()
        .nullable()
        .optional()
        .transform((v) => v ?? undefined)
        .describe('Full asset name when reported by the solver (e.g., "USD Coin")'),
    logoURI: z
        .string()
        .nullable()
        .optional()
        .transform((v) => v ?? undefined)
        .describe("Asset logo URL when reported by the solver"),
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
                z.string(),
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

/**
 * Schema for `Aggregator.getProvidersForRoute` queries.
 *
 * Catches malformed input (wrong shape, missing fields, non-hex addresses) up front
 * rather than letting it silently fall through to "route unsupported".
 *
 * The `z.ZodType<RouteQuery>` annotation pins the schema to the `RouteQuery`
 * interface, so the two cannot drift without a compile error.
 */
export const RouteQuerySchema: z.ZodType<RouteQuery> = z.object({
    originChainId: chainIdSchema,
    originAsset: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid origin asset address (expected 20-byte hex)"),
    destinationChainId: chainIdSchema,
    destinationAsset: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid destination asset address (expected 20-byte hex)"),
});

// Type exports from schemas
export type AssetInfoSchema = z.infer<typeof assetInfoSchema>;
export type NetworkAssetsSchema = z.infer<typeof networkAssetsSchema>;
export type GetAssetsResponseSchema = z.infer<typeof getAssetsResponseSchema>;
