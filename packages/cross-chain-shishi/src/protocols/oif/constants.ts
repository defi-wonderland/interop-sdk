import type { OIFOrderType } from "./types.js";

// ─── Order Types ────────────────────────────────────────────────

export const OIF_ORDER_TYPES = [
  "oif-escrow-v0",
  "oif-resource-lock-v0",
  "oif-3009-v0",
  "oif-user-open-v0",
] as const;

// Which order types map to which adapter
export const ESCROW_ORDER_TYPES: OIFOrderType[] = ["oif-escrow-v0", "oif-resource-lock-v0", "oif-3009-v0"];
export const USER_OPEN_ORDER_TYPES: OIFOrderType[] = ["oif-user-open-v0"];

// ─── Signature Prefixes ─────────────────────────────────────────
// OIF spec requires a prefix byte on signatures for certain order types

export const SIGNATURE_PREFIXES: Partial<Record<OIFOrderType, string>> = {
  "oif-escrow-v0": "0x00",
  "oif-3009-v0": "0x01",
};

// ─── Defaults ───────────────────────────────────────────────────

export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_POLL_INTERVAL_MS = 2_000;
