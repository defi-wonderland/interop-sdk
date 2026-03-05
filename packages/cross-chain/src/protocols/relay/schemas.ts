import { z } from "zod";

import { addressString } from "../../core/schemas/common.js";

// ── Relay Quote v2 ──────────────────────────────────────

/** Schema for currency metadata inside a Relay response. */
const RelayCurrencySchema = z.object({
    chainId: z.number().int().positive(),
    address: z.string(),
    symbol: z.string(),
    name: z.string(),
    decimals: z.number().int().nonnegative(),
    metadata: z
        .object({
            logoURI: z.string().optional(),
            verified: z.boolean().optional(),
            isNative: z.boolean().optional(),
        })
        .optional(),
});

/** Schema for a currency amount object (used in fees and details). */
const RelayCurrencyAmountSchema = z.object({
    currency: RelayCurrencySchema,
    amount: z.string(),
    amountFormatted: z.string().optional(),
    amountUsd: z.string().optional(),
    minimumAmount: z.string().optional(),
});

/** Schema for a single fee entry. */
const RelayFeeSchema = RelayCurrencyAmountSchema;

/** Schema for transaction data inside a step item. */
const RelayStepItemDataSchema = z.object({
    from: addressString.optional(),
    to: addressString,
    data: z.string(),
    value: z.string().optional(),
    chainId: z.number().int().positive(),
    gas: z.string().optional(),
    maxFeePerGas: z.string().optional(),
    maxPriorityFeePerGas: z.string().optional(),
});

/** Schema for a check object that tells the client how to poll status. */
const RelayStepCheckSchema = z.object({
    endpoint: z.string(),
    method: z.string(),
});

/** Schema for a check object inside a step item. */
const RelayStepItemBaseSchema = z.object({
    status: z.enum(["complete", "incomplete"]),
    check: RelayStepCheckSchema.optional(),
});

/** Schema for a transaction step in a Relay quote response. */
const RelayTransactionStepItemSchema = RelayStepItemBaseSchema.extend({
    data: RelayStepItemDataSchema,
});

/** Schema for a signature step item in a Relay quote response. */
const RelaySignatureStepItemSchema = RelayStepItemBaseSchema.extend({
    data: z.record(z.unknown()),
});

/** Schema for a transaction step in a Relay quote response. */
export const RelayTransactionStepSchema = z.object({
    id: z.enum(["deposit", "approve", "authorize", "authorize1", "authorize2", "swap", "send"]),
    action: z.string(),
    description: z.string(),
    kind: z.literal("transaction"),
    requestId: z.string().min(1),
    depositAddress: z.string().optional(),
    items: z.array(RelayTransactionStepItemSchema).min(1),
});

/** Schema for a signature step in a Relay quote response. */
export const RelaySignatureStepSchema = z.object({
    id: z.enum(["deposit", "approve", "authorize", "authorize1", "authorize2", "swap", "send"]),
    action: z.string(),
    description: z.string(),
    kind: z.literal("signature"),
    requestId: z.string().min(1),
    depositAddress: z.string().optional(),
    items: z.array(RelaySignatureStepItemSchema).min(1),
});

/** Schema for a single step in a Relay quote response. */
export const RelayQuoteStepSchema = z.discriminatedUnion("kind", [
    RelayTransactionStepSchema,
    RelaySignatureStepSchema,
]);

/** Schema for the fees breakdown in a quote response. */
const RelayFeesSchema = z.object({
    gas: RelayFeeSchema.optional(),
    relayer: RelayFeeSchema.optional(),
    relayerGas: RelayFeeSchema.optional(),
    relayerService: RelayFeeSchema.optional(),
    app: RelayFeeSchema.optional(),
    subsidized: RelayFeeSchema.optional(),
});

/** Schema for a price impact entry (usd amount). */
const RelayPriceImpactSchema = z.object({
    usd: z.string(),
    percent: z.string().optional(),
});

/** Schema for a slippage tolerance entry. */
const RelaySlippageToleranceEntrySchema = z.object({
    usd: z.string().optional(),
    value: z.string().optional(),
    percent: z.string().optional(),
});

/** Schema for route leg (origin or destination). */
const RelayRouteLegSchema = z.object({
    inputCurrency: RelayCurrencyAmountSchema.optional(),
    outputCurrency: RelayCurrencyAmountSchema.optional(),
    router: z.string().optional(),
    includedSwapSources: z.array(z.string()).optional(),
});

/** Schema for the details object in a quote response. */
const RelayDetailsSchema = z.object({
    operation: z.enum(["send", "swap", "wrap", "unwrap", "bridge"]).optional(),
    sender: z.string().optional(),
    recipient: z.string().optional(),
    currencyIn: RelayCurrencyAmountSchema.optional(),
    currencyOut: RelayCurrencyAmountSchema.optional(),
    refundCurrency: RelayCurrencyAmountSchema.optional(),
    currencyGasTopup: RelayCurrencyAmountSchema.optional(),
    timeEstimate: z.number().nonnegative().optional(),
    rate: z.string().optional(),
    totalImpact: RelayPriceImpactSchema.optional(),
    swapImpact: RelayPriceImpactSchema.optional(),
    expandedPriceImpact: z
        .object({
            swap: z.object({ usd: z.string() }).optional(),
            execution: z.object({ usd: z.string() }).optional(),
            relay: z.object({ usd: z.string() }).optional(),
            app: z.object({ usd: z.string() }).optional(),
            sponsored: z.object({ usd: z.string() }).optional(),
        })
        .optional(),
    slippageTolerance: z
        .object({
            origin: RelaySlippageToleranceEntrySchema.optional(),
            destination: RelaySlippageToleranceEntrySchema.optional(),
        })
        .optional(),
    userBalance: z.string().optional(),
    fallbackType: z.string().optional(),
    isFixedRate: z.boolean().optional(),
    fixedRateFee: z.object({ usd: z.string() }).optional(),
    route: z
        .object({
            origin: RelayRouteLegSchema.optional(),
            destination: RelayRouteLegSchema.optional(),
        })
        .optional(),
});

/** Schema for the protocol-specific v2 order data. */
const RelayProtocolV2Schema = z.object({
    orderId: z.string().optional(),
    orderData: z.unknown().optional(),
    paymentDetails: z
        .object({
            chainId: z.string().optional(),
            depository: z.string().optional(),
            currency: z.string().optional(),
            amount: z.string().optional(),
        })
        .optional(),
});

/** Schema for the Relay POST `/quote/v2` response body. */
export const RelayQuoteResponseSchema = z.object({
    steps: z.array(RelayQuoteStepSchema).min(1),
    fees: RelayFeesSchema,
    details: RelayDetailsSchema,
    protocol: z.object({ v2: RelayProtocolV2Schema.optional() }).optional(),
});

// ── Relay Error Responses ──────────────────────────────

/** Schema for the Relay 400 Bad Request response. */
export const RelayBadRequestResponseSchema = z.object({
    message: z.string(),
    errorCode: z.string(),
    errorData: z.string().optional(),
    requestId: z.string().optional(),
    approxSimulatedBlock: z.number().optional(),
    failedCallData: z
        .object({
            from: z.string().optional(),
            to: z.string().optional(),
            data: z.string().optional(),
            value: z.string().optional(),
        })
        .optional(),
});

/** Schema for the Relay 401 Unauthorized response. */
export const RelayUnauthorizedResponseSchema = z.object({
    message: z.string(),
    errorCode: z.string(),
});

/** Schema for the Relay 429 Rate Limited response. */
export const RelayRateLimitedResponseSchema = z.object({
    message: z.string(),
});

/** Schema for the Relay 500 Server Error response. */
export const RelayServerErrorResponseSchema = z.object({
    message: z.string(),
    errorCode: z.string(),
    requestId: z.string().optional(),
});

// ── Relay Intent Status v3 ──────────────────────────────

/** Valid Relay intent statuses as documented in the API. */
export const RelayIntentStatusEnum = z.enum([
    "waiting",
    "pending",
    "submitted",
    "success",
    "delayed",
    "refunded",
    "failure",
    "refund",
    "unknown",
]);

/** Schema for the Relay GET `/intents/status/v3` response body. */
export const RelayIntentStatusResponseSchema = z.object({
    status: RelayIntentStatusEnum,
    details: z.string().optional(),
    inTxHashes: z.array(z.string()).optional(),
    txHashes: z.array(z.string()).optional(),
    updatedAt: z.number().optional(),
    originChainId: z.number().int().positive().optional(),
    destinationChainId: z.number().int().positive().optional(),
});

// ── Types ───────────────────────────────────────────────

/** A single step in a Relay quote response. */
export type RelayQuoteStep = z.infer<typeof RelayQuoteStepSchema>;

/** Response from the Relay POST `/quote/v2` endpoint. */
export type RelayQuoteResponse = z.infer<typeof RelayQuoteResponseSchema>;

/** Status of a Relay intent. */
export type RelayIntentStatus = z.infer<typeof RelayIntentStatusEnum>;

/** Response from the Relay GET `/intents/status/v3` endpoint. */
export type RelayIntentStatusResponse = z.infer<typeof RelayIntentStatusResponseSchema>;

/** Relay 400 Bad Request response. */
export type RelayBadRequestResponse = z.infer<typeof RelayBadRequestResponseSchema>;

/** Relay 401 Unauthorized response. */
export type RelayUnauthorizedResponse = z.infer<typeof RelayUnauthorizedResponseSchema>;

/** Relay 429 Rate Limited response. */
export type RelayRateLimitedResponse = z.infer<typeof RelayRateLimitedResponseSchema>;

/** Relay 500 Server Error response. */
export type RelayServerErrorResponse = z.infer<typeof RelayServerErrorResponseSchema>;
