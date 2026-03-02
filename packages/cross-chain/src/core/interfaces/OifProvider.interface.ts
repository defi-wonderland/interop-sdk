import { z } from "zod";

import { OifProviderConfigSchema } from "../../protocols/oif/schemas/oif.js";

export type OifProviderConfig = z.infer<typeof OifProviderConfigSchema>;
