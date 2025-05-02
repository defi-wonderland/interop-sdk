import { pad, trim } from "viem";
import { z } from "zod";

export const interopAddressSchema = z.object({
    version: z.number().positive().int(),
    chainType: z
        .instanceof(Uint8Array)
        .refine((value) => trim(value).length <= 2, {
            message: "Chain type must be representable as 2 bytes",
        })
        .transform((value) => pad(trim(value), { size: 2 })),
    chainReference: z.instanceof(Uint8Array),
    address: z.instanceof(Uint8Array),
});
