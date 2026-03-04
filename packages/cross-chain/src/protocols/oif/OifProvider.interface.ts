import { z } from "zod";

import { OifProviderConfigSchema } from "./schemas.js";

export type OifProviderConfig = z.infer<typeof OifProviderConfigSchema>;
