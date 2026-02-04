/**
 * Zod schemas for Across /swap/tokens API responses
 */

import { z } from "zod";

/**
 * EVM address: 0x followed by 40 hex characters
 */
const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

/**
 * Solana address: Base58-encoded public key (32-44 characters)
 * Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
 */
const solanaAddressSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

/**
 * Combined address schema supporting both EVM and Solana addresses
 */
const addressSchema = z.union([evmAddressSchema, solanaAddressSchema]);

export const acrossTokenSchema = z.object({
    chainId: z.number().int().positive(),
    address: addressSchema,
    symbol: z.string().min(1),
    decimals: z.number().int().min(0).max(255),
    name: z.string().optional(),
    logoUrl: z.string().optional(),
    priceUsd: z.string().nullable().optional(),
});

export const acrossTokensResponseSchema = z.array(acrossTokenSchema);

export type AcrossToken = z.infer<typeof acrossTokenSchema>;
