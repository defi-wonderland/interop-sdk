import { z } from "zod";

/**
 * A checksum is an 8-character uppercase hex string as per ERC-7930
 */
export const ChecksumSchema = z
    .string()
    .length(8)
    .regex(/^[0-9A-F]+$/, {
        message: "Checksum must be an 8-character uppercase hex string",
    })
    .brand<"Checksum">();
