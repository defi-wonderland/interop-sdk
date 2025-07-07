import { Hex } from "viem";
import { z } from "zod";

import { SUPPORTED_TOKEN_BY_CHAIN_ID } from "../../constants/tokens.js";
import { HexAddressSchema } from "../address.js";
import { SupportedChainIdSchema } from "../chain.js";

export const TransferGetQuoteParamsSchema = z
    .object({
        recipient: HexAddressSchema,
        sender: HexAddressSchema,
        inputTokenAddress: HexAddressSchema,
        outputTokenAddress: HexAddressSchema,
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
