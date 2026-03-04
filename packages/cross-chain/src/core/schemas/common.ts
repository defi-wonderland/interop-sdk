import { isAddress } from "viem";
import { z } from "zod";

export const addressString = z.string().refine((val): boolean => isAddress(val), {
    message: "Invalid hex address",
});

export const amountSchema = z
    .string()
    .regex(/^[0-9]+$/)
    .describe("Token amount in smallest unit (decimal string, no decimals or scientific notation)");

export const chainIdSchema = z.number().int().positive().refine(Number.isSafeInteger, {
    message: "chainId must be a safe integer",
});
