/**
 * Zod schemas for Across /swap/tokens API responses
 */

import { z } from "zod";

export const acrossTokenSchema = z.object({
    chainId: z.number().int().positive(),
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    symbol: z.string().min(1),
    decimals: z.number().int().min(0).max(255),
    name: z.string().optional(),
    logoUrl: z.string().optional(),
    priceUsd: z.string().nullable().optional(),
});

export const acrossTokensResponseSchema = z.array(acrossTokenSchema);

export type AcrossToken = z.infer<typeof acrossTokenSchema>;
