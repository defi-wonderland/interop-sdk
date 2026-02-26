import type { OIF_ORDER_TYPES } from "./constants.js";

export type OIFOrderType = (typeof OIF_ORDER_TYPES)[number];

// Canonical EIP-712 type definitions per order type (used by normalizeTypedData)
export type EIP712TypeDefinition = Record<string, Array<{ name: string; type: string }>>;

// Terminal statuses — once reached, no further polling needed
export const TERMINAL_STATUSES = new Set(["filled", "failed", "expired", "refunded"]);
