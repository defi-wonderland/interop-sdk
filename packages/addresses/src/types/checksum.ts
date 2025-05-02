import { z } from "zod";

import { checksumSchema } from "../internal.js";

/**
 * A checksum is an 8-character uppercase hex string as per ERC-7930
 */
export type Checksum = z.infer<typeof checksumSchema>;
