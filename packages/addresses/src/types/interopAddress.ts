import { z } from "zod";

import { interopAddressSchema } from "../schemas/interopAddress.js";

export type InteropAddress = z.infer<typeof interopAddressSchema>;

export type ChainType = InteropAddress["chainType"];

export type ChainReference = InteropAddress["chainReference"];

export type Address = InteropAddress["address"];
