import { isAddress } from "viem";
import { z } from "zod";

export const HexSchema = z.string().refine((val) => isAddress(val), {
    message: "Invalid hex address",
});
