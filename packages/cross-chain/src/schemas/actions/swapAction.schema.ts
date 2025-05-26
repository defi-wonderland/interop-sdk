import { Hex } from "viem";
import { z } from "zod";

import { HexAddressSchema, SUPPORTED_TOKEN_BY_CHAIN_ID } from "../../internal.js";
import { SupportedChainIdSchema } from "../chain.js";

export const SwapGetQuoteParamsSchema = z
    .object({
        sender: HexAddressSchema,
        recipient: HexAddressSchema,
        inputAmount: z.string(),
        outputAmount: z.string(),
        inputTokenAddress: HexAddressSchema,
        outputTokenAddress: HexAddressSchema,
        inputChainId: SupportedChainIdSchema,
        outputChainId: SupportedChainIdSchema,
        slippage: z.string(),
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
