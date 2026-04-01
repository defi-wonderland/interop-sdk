import { z } from "zod";

// ── Shared ──────────────────────────────────────────────

const ChainIdString = z.string().regex(/^eip155:\d+$/);
const HexAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const HexData = z.string().regex(/^0x[0-9a-fA-F]*$/);

/** Top-level user field still uses the {chain, address} shape. */
export const Caip10AddressSchema = z.object({
    chain: ChainIdString,
    address: HexAddress,
});

export type Caip10Address = z.infer<typeof Caip10AddressSchema>;

// ── Provider Config ─────────────────────────────────────

export const LifiIntentsProviderConfigSchema = z.object({
    orderServerUrl: z.string().url(),
    providerId: z.string().optional(),
    headers: z.record(z.string()).optional(),
});

// ── Quote Request (SDK → LI.FI) ────────────────────────
// New flat format: chain is a top-level field, user/asset/receiver are plain strings.

export const LifiIntentsQuoteRequestSchema = z.object({
    user: Caip10AddressSchema,
    intent: z.object({
        intentType: z.literal("oif-swap"),
        inputs: z.array(
            z.object({
                chain: ChainIdString,
                user: HexAddress,
                asset: HexAddress,
                amount: z.string(),
            }),
        ),
        outputs: z.array(
            z.object({
                chain: ChainIdString,
                receiver: HexAddress,
                asset: HexAddress,
                amount: z.null(),
            }),
        ),
        swapType: z.literal("exact-input"),
    }),
    supportedTypes: z.array(z.string()),
});

export type LifiIntentsQuoteRequest = z.infer<typeof LifiIntentsQuoteRequestSchema>;

// ── Quote Response (LI.FI → SDK) ───────────────────────
// Response uses the same flat format: chain + plain address strings.

const LifiIntentsOrderSchema = z.object({
    type: z.literal("oif-user-open-v0"),
    openIntentTx: z.object({
        chain: ChainIdString,
        to: HexAddress,
        data: HexData,
        gasRequired: z.string(),
    }),
    checks: z
        .object({
            allowances: z.array(
                z.object({
                    chain: ChainIdString,
                    token: HexAddress,
                    user: HexAddress,
                    spender: HexAddress,
                    required: z.string(),
                }),
            ),
        })
        .optional(),
});

const LifiIntentsQuoteEntrySchema = z.object({
    order: LifiIntentsOrderSchema.nullable(),
    quoteId: z.string().optional(),
    provider: z.string().optional(),
    validUntil: z.number().optional(),
    preview: z.object({
        inputs: z.array(
            z.object({
                chain: ChainIdString,
                user: HexAddress,
                asset: HexAddress,
                amount: z.string(),
            }),
        ),
        outputs: z.array(
            z.object({
                chain: ChainIdString,
                receiver: HexAddress,
                asset: HexAddress,
                amount: z.string(),
            }),
        ),
    }),
    failureHandling: z.string().optional(),
    partialFill: z.boolean().optional(),
    metadata: z
        .object({
            exclusiveFor: z.string().nullable().optional(),
        })
        .passthrough()
        .optional(),
});

export const LifiIntentsQuoteResponseSchema = z.object({
    quotes: z.array(LifiIntentsQuoteEntrySchema),
});

export type LifiIntentsOrder = z.infer<typeof LifiIntentsOrderSchema>;
export type LifiIntentsQuoteEntry = z.infer<typeof LifiIntentsQuoteEntrySchema>;
export type LifiIntentsQuoteResponse = z.infer<typeof LifiIntentsQuoteResponseSchema>;

// ── Order Status (LI.FI → SDK) ─────────────────────────

const LifiIntentsOrderStatusMetaSchema = z.object({
    submitTime: z.number().optional(),
    orderStatus: z.string(),
    orderIdentifier: z.string().optional(),
    onChainOrderId: z.string().optional(),
    signedAt: z.string().nullable().optional(),
    deliveredAt: z.string().nullable().optional(),
    settledAt: z.string().nullable().optional(),
    expiredAt: z.string().nullable().optional(),
    orderInitiatedTxHash: z.string().nullable().optional(),
    orderDeliveredTxHash: z.string().nullable().optional(),
    orderVerifiedTxHash: z.string().nullable().optional(),
    orderSettledTxHash: z.string().nullable().optional(),
});

/** Single-order response from /orders/status?onChainOrderId=... */
export const LifiIntentsOrderStatusResponseSchema = z.object({
    order: z.record(z.unknown()).optional(),
    meta: LifiIntentsOrderStatusMetaSchema,
});

export type LifiIntentsOrderStatusResponse = z.infer<typeof LifiIntentsOrderStatusResponseSchema>;

// ── Routes (Asset Discovery) ────────────────────────────

const LifiIntentsRouteTokenSchema = z.object({
    symbol: z.string().nullable(),
    name: z.string().nullable(),
    address: z.string(),
    decimals: z.number(),
});

export const LifiIntentsRouteSchema = z.object({
    fromChain: z.object({ chainId: z.string() }).passthrough(),
    toChain: z.object({ chainId: z.string() }).passthrough(),
    fromToken: LifiIntentsRouteTokenSchema,
    toToken: LifiIntentsRouteTokenSchema,
});

export const LifiIntentsRoutesResponseSchema = z.object({
    routes: z.array(LifiIntentsRouteSchema),
});

export type LifiIntentsRoute = z.infer<typeof LifiIntentsRouteSchema>;
