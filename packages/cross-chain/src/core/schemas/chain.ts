import { z } from "zod";

import { SUPPORTED_CHAINS } from "../constants/chains.js";

export const SupportedChainIdSchema = z.union(
    SUPPORTED_CHAINS.map((chain) => z.literal(chain.id)) as unknown as [
        z.ZodLiteral<(typeof SUPPORTED_CHAINS)[number]["id"]>,
        z.ZodLiteral<(typeof SUPPORTED_CHAINS)[number]["id"]>,
        ...z.ZodLiteral<(typeof SUPPORTED_CHAINS)[number]["id"]>[],
    ],
);
