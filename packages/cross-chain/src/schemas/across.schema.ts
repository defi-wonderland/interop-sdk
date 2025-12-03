import {
    failureHandlingModeSchema,
    inputSchema,
    originSubmissionSchema,
    outputSchema,
    quotePreferenceSchema,
    swapTypeSchema,
} from "@wonderland/interop-oif-specs";
import { v4 as uuidv4 } from "uuid";
import { isHex } from "viem";
import { z } from "zod";

import { HexAddressSchema } from "./address.js";

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
});

export const TokenSchema = z.object({
    address: HexAddressSchema,
    chainId: z.number(),
    decimals: z.number(),
    symbol: z.string(),
    name: z.string().optional(),
});

export const FeeSchema = z.object({
    amount: z.string().optional(),
    amountUsd: z.string().optional(),
    pct: z.string().optional(),
    token: TokenSchema.optional(),
});

export const AcrossSwapTxSchema = z.object({
    simulationSuccess: z.boolean(),
    chainId: z.number(),
    to: HexAddressSchema,
    data: z.string().refine((data) => isHex(data), { message: "Invalid hex data" }),
    gas: z.string().optional().default("0"),
    maxFeePerGas: z.string(),
    maxPriorityFeePerGas: z.string(),
});

export const AcrossGetQuoteResponseSchema = z.object({
    id: z.string(),
    inputToken: TokenSchema,
    outputToken: TokenSchema,
    inputAmount: z.string(),
    expectedOutputAmount: z.string(),
    minOutputAmount: z.string(),
    fees: z
        .object({
            total: FeeSchema,
            maxTotal: FeeSchema.optional(),
            originGas: FeeSchema.optional(),
            destinationGas: FeeSchema.optional(),
            relayerCapital: FeeSchema.optional(),
            lpFee: FeeSchema.optional(),
            relayerTotal: FeeSchema.optional(),
            bridgeFee: FeeSchema.optional(),
            app: FeeSchema.optional(),
            swapImpact: FeeSchema.optional(),
            maxSwapImpact: FeeSchema.optional(),
        })
        .optional(),
    swapTx: AcrossSwapTxSchema,
    expectedFillTime: z.number(),
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
        apiUrl: z.string(),
        providerId: z.string().default(`across_${uuidv4()}`),
    })
    .describe("Configuration for the Across provider");
