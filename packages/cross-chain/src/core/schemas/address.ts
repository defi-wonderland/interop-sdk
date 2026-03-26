import { isAddress } from "viem";
import { z } from "zod";

import { SupportedChainIdSchema } from "./chain.js";

/** EIP-7930 interoperable address format (0x0001 + chain ID + address) */
export const AddressSchema = z
    .string()
    .regex(/^0x0001[a-fA-F0-9]{8,}$/)
    .describe(
        "Cross-chain compatible address format per EIP-7930 version 1 encoded format (0x0001 + chain ID + address) for\nunambiguous cross-chain identification.",
    );

export const HexAddressSchema = z.string().refine((val) => isAddress(val, { strict: false }), {
    message: "Invalid hex address",
});

export const AddressWithChainRawSchema = z.object({
    address: HexAddressSchema,
    chainId: SupportedChainIdSchema,
});
