import { z } from "zod";

import { interopAddressFieldsSchema, interopAddressSchema } from "../internal.js";

export type InteropAddressFields = z.infer<typeof interopAddressFieldsSchema>;

export type InteropAddress = z.infer<typeof interopAddressSchema>;

export type ChainType = InteropAddress["chainType"];

export type ChainReference = InteropAddress["chainReference"];

export type Address = InteropAddress["address"];
