import { pad, trim } from "viem";
import { z } from "zod";

export const interopAddressFieldsSchema = z.object({
    version: z.number().positive().int(),
    chainType: z.string(),
    chainReference: z.string().optional(),
    address: z.string().optional(),
});

export const interopAddressSchema = z.object({
    version: z.number().positive().int(),
    chainType: z
        .custom<Uint8Array>((value) => value instanceof Uint8Array, {
            message: "Chain type must be a Uint8Array",
        })
        .refine((value) => trim(value).length <= 2, {
            message: "Chain type must be representable as 2 bytes",
        })
        .transform((value) => pad(trim(value), { size: 2 })),
    chainReference: z
        .custom<Uint8Array>((value) => value instanceof Uint8Array, {
            message: "Chain reference must be a Uint8Array",
        })
        .refine((value) => trim(value).length <= 32, {
            message: "Chain reference must be representable as 32 bytes",
        }),
    address: z
        .custom<Uint8Array>((value) => value instanceof Uint8Array, {
            message: "Address must be a Uint8Array",
        })
        .refine((value) => trim(value).length <= 255, {
            message: "Address must be representable as 255 bytes",
        }),
});
