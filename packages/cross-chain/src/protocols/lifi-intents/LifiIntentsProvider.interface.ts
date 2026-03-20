import { z } from "zod";

import { LifiIntentsProviderConfigSchema } from "./schemas.js";

export type LifiIntentsProviderConfig = z.infer<typeof LifiIntentsProviderConfigSchema>;
