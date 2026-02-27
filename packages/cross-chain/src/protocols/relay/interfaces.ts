import { z } from "zod";

import {
    RelayConfigSchema,
    RelayQuoteRequestSchema,
    RelayQuoteResponseSchema,
    RelayStepItemDataSchema,
    RelayStepItemSchema,
    RelayStepSchema,
} from "../../internal.js";

/** Relay provider configuration (input type, before defaults applied) */
export type RelayConfigs = z.input<typeof RelayConfigSchema>;

/** Validated Relay quote request body */
export type RelayQuoteRequest = z.infer<typeof RelayQuoteRequestSchema>;

/** Validated Relay quote response */
export type RelayQuoteResponse = z.infer<typeof RelayQuoteResponseSchema>;

/** A single step in the Relay response */
export type RelayStep = z.infer<typeof RelayStepSchema>;

/** A single item within a Relay step */
export type RelayStepItem = z.infer<typeof RelayStepItemSchema>;

/** Transaction data within a step item */
export type RelayStepItemData = z.infer<typeof RelayStepItemDataSchema>;
