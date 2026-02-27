import { z } from "zod";

import { OifProviderConfigSchema } from "../../protocols/oif/schemas.js";

export type OifProviderConfig = z.infer<typeof OifProviderConfigSchema>;
