import { isAddress } from "viem";
import { z } from "zod";

import { SupportedChainIdSchema } from "./chain.js";

/**
 * EIP-7930 interoperable address format (0x0001 + chain ID + address).
 * Used across the SDK for cross-chain compatible address validation.
 */
export const addressSchema = z
    .string()
    .regex(/^0x0001[a-fA-F0-9]+$/)
    .describe(
        "Cross-chain compatible address format per EIP-7930 version 1 encoded format (0x0001 + chain ID + address) for\nunambiguous cross-chain identification.",
    );

export const HexAddressSchema = z.string().refine((val) => isAddress(val), {
    message: "Invalid hex address",
});

export const AddressWithChainRawSchema = z.object({
    address: HexAddressSchema,
    chainId: SupportedChainIdSchema,
});
