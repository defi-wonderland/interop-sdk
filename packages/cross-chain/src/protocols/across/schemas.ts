import { v4 as uuidv4 } from "uuid";
import { isHex } from "viem";
import { z } from "zod";

import { HexAddressSchema } from "../../core/schemas/address.js";
import {
    failureHandlingModeSchema,
    inputSchema,
    originSubmissionSchema,
    outputSchema,
    quotePreferenceSchema,
    swapTypeSchema,
} from "../oif/schemas.js";

export const AcrossGetQuoteParamsSchema = z.object({
    tradeType: z
        .enum(["exactInput", "exactOutput", "exact-input", "exact-output"])
        .transform((data) => {
            if (data === "exact-input") return "exactInput";
            if (data === "exact-output") return "exactOutput";
            return data;
        }),
    amount: z.string(),
    inputToken: HexAddressSchema,
    outputToken: HexAddressSchema,
    originChainId: z.number().transform((data) => data.toString()),
    destinationChainId: z.number().transform((data) => data.toString()),
    depositor: HexAddressSchema,
    recipient: HexAddressSchema,
});

export const TokenSchema = z.object({
    address: HexAddressSchema,
    chainId: z.number().int(),
    decimals: z.number().int(),
    symbol: z.string(),
    name: z.string().optional(),
});

export const FeeSchema = z.object({
    amount: z.string().optional(),
    amountUsd: z.string().optional(),
    pct: z.string().optional(),
    token: TokenSchema.optional(),
});

export const AcrossApprovalTxSchema = z.object({
    chainId: z.number().int().optional(),
    to: HexAddressSchema.optional(),
    data: z
        .string()
        .refine((data) => isHex(data), { message: "Invalid hex data" })
        .optional(),
});

export const AcrossAllowanceCheckSchema = z.object({
    token: HexAddressSchema.optional(),
    spender: HexAddressSchema.optional(),
    actual: z.string().optional(),
    expected: z.string().optional(),
});

export const AcrossBalanceCheckSchema = z.object({
    token: HexAddressSchema.optional(),
    actual: z.string().optional(),
    expected: z.string().optional(),
});

export const AcrossChecksSchema = z.object({
    allowance: AcrossAllowanceCheckSchema.optional(),
    balance: AcrossBalanceCheckSchema.optional(),
});

export const AcrossSwapProviderSchema = z.object({
    name: z.string().optional(),
    sources: z.array(z.string()).optional(),
});

export const AcrossBridgeFeeDetailsSchema = z.object({
    type: z.string().optional(),
    relayerCapital: FeeSchema.optional(),
    destinationGas: FeeSchema.optional(),
    lp: FeeSchema.optional(),
});

export const AcrossBridgeFeesSchema = z.object({
    amount: z.string().optional(),
    pct: z.string().optional(),
    token: TokenSchema.optional(),
    details: AcrossBridgeFeeDetailsSchema.optional(),
});

export const AcrossOriginSwapStepSchema = z.object({
    tokenIn: TokenSchema.optional(),
    tokenOut: TokenSchema.optional(),
    inputAmount: z.string().optional(),
    outputAmount: z.string().optional(),
    minOutputAmount: z.string().optional(),
    maxInputAmount: z.string().optional(),
    swapProvider: AcrossSwapProviderSchema.optional(),
    slippage: z.number().optional(),
});

export const AcrossBridgeStepSchema = z.object({
    inputAmount: z.string().optional(),
    outputAmount: z.string().optional(),
    tokenIn: TokenSchema.optional(),
    tokenOut: TokenSchema.optional(),
    fees: AcrossBridgeFeesSchema.optional(),
    provider: z.string().optional(),
});

export const AcrossDestinationSwapStepSchema = z.object({
    tokenIn: TokenSchema.optional(),
    tokenOut: TokenSchema.optional(),
    inputAmount: z.string().optional(),
    maxInputAmount: z.string().optional(),
    outputAmount: z.string().optional(),
    minOutputAmount: z.string().optional(),
    swapProvider: AcrossSwapProviderSchema.optional(),
    slippage: z.number().optional(),
});

export const AcrossStepsSchema = z.object({
    originSwap: AcrossOriginSwapStepSchema.optional(),
    bridge: AcrossBridgeStepSchema.optional(),
    destinationSwap: AcrossDestinationSwapStepSchema.optional(),
});

export const AcrossBridgeFeeWithBreakdownSchema = FeeSchema.extend({
    details: AcrossBridgeFeeDetailsSchema.nullish(),
});

export const AcrossTotalFeeDetailsSchema = z.object({
    type: z.string().optional(),
    swapImpact: FeeSchema.optional(),
    maxSwapImpact: FeeSchema.optional(),
    app: FeeSchema.optional(),
    bridge: AcrossBridgeFeeWithBreakdownSchema.optional(),
});

export const AcrossTotalFeeSchema = z.object({
    amount: z.string().optional(),
    amountUsd: z.string().optional(),
    token: TokenSchema.optional(),
    pct: z.string().optional(),
    details: AcrossTotalFeeDetailsSchema.optional(),
});

export const AcrossFeesSchema = z.object({
    total: AcrossTotalFeeSchema.optional(),
    totalMax: AcrossTotalFeeSchema.optional(),
    originGas: FeeSchema.optional(),
});

export const AcrossSwapTxSchema = z.object({
    simulationSuccess: z.boolean(),
    chainId: z.number().int(),
    to: HexAddressSchema,
    data: z.string().refine((data) => isHex(data), { message: "Invalid hex data" }),
    value: z.string().optional(),
    gas: z.string().optional().default("0"),
    maxFeePerGas: z.string().optional(),
    maxPriorityFeePerGas: z.string().optional(),
});

export const AcrossCrossSwapTypeSchema = z.enum([
    "bridgeableToBridgeable",
    "bridgeableToBridgeableIndirect",
    "anyToBridgeable",
    "bridgeableToAny",
    "anyToAny",
]);

/**
 * Mirrors the `GET /swap/approval` response. Optional fields stay optional so
 * the parser does not break when the upstream adds new ones.
 *
 * @see https://docs.across.to/api-reference/swap/approval/get
 */
export const AcrossGetQuoteResponseSchema = z.object({
    id: z.string(),
    crossSwapType: AcrossCrossSwapTypeSchema.optional(),
    amountType: z.string().optional(),
    approvalTxns: z.array(AcrossApprovalTxSchema).optional(),
    checks: AcrossChecksSchema.optional(),
    steps: AcrossStepsSchema.optional(),
    inputToken: TokenSchema,
    outputToken: TokenSchema,
    refundToken: TokenSchema.optional(),
    fees: AcrossFeesSchema.optional(),
    inputAmount: z.string(),
    maxInputAmount: z.string().optional(),
    expectedOutputAmount: z.string(),
    minOutputAmount: z.string(),
    expectedFillTime: z.number(),
    swapTx: AcrossSwapTxSchema,
    quoteExpiryTimestamp: z.number().optional(),
});

export const AcrossOIFGetQuoteParamsSchema = z.object({
    user: z.string(),
    intent: z.object({
        intentType: z.literal("oif-swap").optional(),
        inputs: z.tuple([inputSchema]),
        outputs: z.tuple([outputSchema]),
        swapType: swapTypeSchema.optional(),
        preference: quotePreferenceSchema.optional(),
        originSubmission: originSubmissionSchema.optional(),
        failureHandling: z.array(failureHandlingModeSchema).optional(),
        partialFill: z.boolean().optional(),
        metadata: z.record(z.any()).optional(),
    }),
    supportedTypes: z.array(z.string()),
});

export const AcrossConfigSchema = z
    .object({
        isTestnet: z.boolean().optional().default(false),
        apiUrl: z.string().optional(),
        providerId: z.string().default(`across_${uuidv4()}`),
    })
    .describe("Configuration for the Across provider");
