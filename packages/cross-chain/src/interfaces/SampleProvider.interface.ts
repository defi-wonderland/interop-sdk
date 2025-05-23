import { z } from "zod";

import { SampleOpenParamsSchema } from "../internal.js";

export type SampleOpenParams = z.infer<typeof SampleOpenParamsSchema>;
