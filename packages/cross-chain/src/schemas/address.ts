import { isAddress } from "viem";
import { z } from "zod";

import { SupportedChainIdSchema } from "./chain.js";

export const HexAddressSchema = z.string().refine((val) => isAddress(val), {
    message: "Invalid hex address",
});

export const AddressWithChainRawSchema = z.object({
    address: HexAddressSchema,
    chainId: SupportedChainIdSchema,
});
