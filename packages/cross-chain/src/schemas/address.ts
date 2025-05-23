import { z } from "zod";

import { SupportedChainIdSchema } from "./chain.js";
import { HexSchema } from "./hex.js";

export const AddressWithChainRawSchema = z.object({
    address: HexSchema,
    chainId: SupportedChainIdSchema,
});
