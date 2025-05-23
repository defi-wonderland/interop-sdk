import { Hex } from "viem";
import { z } from "zod";

import { SUPPORTED_TOKEN_BY_CHAIN_ID } from "../../internal.js";
import { SupportedChainIdSchema } from "../chain.js";
import { HexSchema } from "../hex.js";

export const TransferGetQuoteParamsSchema = z
    .object({
        recipient: HexSchema,
        sender: HexSchema,
        inputTokenAddress: HexSchema,
        outputTokenAddress: HexSchema,
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
