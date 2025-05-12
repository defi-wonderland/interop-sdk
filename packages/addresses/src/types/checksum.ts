import { z } from "zod";

import { ChecksumSchema } from "../internal.js";

/**
 * A checksum is an 8-character uppercase hex string as per ERC-7930
 */
export type Checksum = z.infer<typeof ChecksumSchema>;
