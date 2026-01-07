import { pad, trim } from "viem";
import { z } from "zod";

/**
 * Schema for validating InteroperableAddressText input.
 * Used by parseInteroperableName to validate and convert text representation to binary.
 */
export const interoperableAddressTextSchema = z
    .object({
        version: z.number().positive().int(),
        chainType: z.enum(["eip155", "solana"]),
        chainReference: z.string().optional(),
        address: z.string().optional(),
    })
    .refine((data) => data.chainReference !== undefined || data.address !== undefined, {
        message: "At least one of chainReference or address must be provided",
    });

export const interoperableAddressSchema = z.object({
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
