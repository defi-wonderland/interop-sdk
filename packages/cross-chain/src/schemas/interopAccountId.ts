import { isAddress } from "viem";
import { z } from "zod";

/**
 * Zod schema for {@link InteropAccountId}.
 *
 * Validates that `address` is a valid hex address and `chainId` is a
 * positive integer.
 */
export const InteropAccountIdSchema = z.object({
    chainId: z.number().int().positive(),
    address: z.string().refine((val) => isAddress(val), {
        message: "Invalid hex address",
    }),
});
