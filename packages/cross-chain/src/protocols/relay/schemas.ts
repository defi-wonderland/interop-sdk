import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { HexAddressSchema } from "../../core/schemas/address.js";

/**
 * Configuration schema for the Relay provider
 */
export const RelayConfigSchema = z
    .object({
        isTestnet: z.boolean().optional().default(false),
        apiUrl: z.string().optional(),
        apiKey: z.string().optional(),
        source: z.string().optional(),
        providerId: z.string().default(`relay_${uuidv4()}`),
    })
    .describe("Configuration for the Relay provider");

/**
 * Schema for Relay quote request body sent to POST /quote/v2
 */
export const RelayQuoteRequestSchema = z.object({
    user: HexAddressSchema,
    originChainId: z.number(),
    destinationChainId: z.number(),
    originCurrency: HexAddressSchema,
    destinationCurrency: HexAddressSchema,
    amount: z.string(),
    tradeType: z.enum(["EXACT_INPUT", "EXACT_OUTPUT"]),
    recipient: HexAddressSchema.optional(),
});

/**
 * Schema for individual step item transaction data
 */
export const RelayStepItemDataSchema = z.object({
    from: HexAddressSchema,
    to: HexAddressSchema,
    data: z.string(),
    value: z.string().optional(),
    chainId: z.number(),
    maxFeePerGas: z.string().optional(),
    maxPriorityFeePerGas: z.string().optional(),
});

/**
 * Schema for a step item (individual action within a step)
 */
export const RelayStepItemSchema = z.object({
    status: z.string(),
    data: RelayStepItemDataSchema,
    check: z
        .object({
            endpoint: z.string(),
            method: z.string(),
        })
        .optional(),
});

/**
 * Schema for a step (group of related actions)
 */
export const RelayStepSchema = z.object({
    id: z.string(),
    kind: z.string(),
    requestId: z.string().optional(),
    action: z.string().optional(),
    description: z.string().optional(),
    items: z.array(RelayStepItemSchema),
});

/**
 * Schema for the full Relay quote response from POST /quote/v2
 * Uses passthrough on fees/details for resilience against API changes
 */
export const RelayQuoteResponseSchema = z.object({
    steps: z.array(RelayStepSchema),
    fees: z.record(z.unknown()).optional(),
    details: z
        .object({
            currencyIn: z
                .object({
                    amount: z.string().optional(),
                    amountFormatted: z.string().optional(),
                    currency: z.record(z.unknown()).optional(),
                })
                .optional(),
            currencyOut: z
                .object({
                    amount: z.string().optional(),
                    amountFormatted: z.string().optional(),
                    currency: z.record(z.unknown()).optional(),
                })
                .optional(),
            timeEstimate: z.number().optional(),
            rate: z.string().optional(),
        })
        .passthrough()
        .optional(),
});
