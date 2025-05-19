import { Hex, isAddress } from "viem";
import { z } from "zod";

import { SUPPORTED_TOKEN_BY_CHAIN_ID, SupportedChainIdSchema } from "../../internal.js";

export const TransferGetQuoteParamsSchema = z
    .object({
        inputTokenAddress: z.string().refine((val) => isAddress(val), {
            message: "Invalid input token address",
        }),
        outputTokenAddress: z.string().refine((val) => isAddress(val), {
            message: "Invalid output token address",
        }),
        inputAmount: z.string(),
        inputChainId: SupportedChainIdSchema,
        outputChainId: SupportedChainIdSchema,
    })
    .superRefine((val, ctx) => {
        const validInputTokens: readonly Hex[] = SUPPORTED_TOKEN_BY_CHAIN_ID[val.inputChainId];
        if (!validInputTokens.includes(val.inputTokenAddress)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Invalid input token address for chain ${val.inputChainId}`,
                path: ["inputTokenAddress"],
            });
        }

        const validOutputTokens: readonly Hex[] = SUPPORTED_TOKEN_BY_CHAIN_ID[val.outputChainId];
        if (!validOutputTokens.includes(val.outputTokenAddress)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Invalid output token address for chain ${val.outputChainId}`,
                path: ["outputTokenAddress"],
            });
        }
    });
