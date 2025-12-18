import { z } from "zod";

import { OifProviderConfigSchema } from "../internal.js";

export type OifProviderConfig = z.infer<typeof OifProviderConfigSchema>;
