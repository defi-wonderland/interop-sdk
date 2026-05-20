import type { Address } from "viem";
import { getAddress, isAddress } from "viem";

import { PERMIT2_BATCH_PRIMARY_TYPES, PERMIT2_PRIMARY_TYPES } from "../constants/permit2.js";

export interface Permit2TokenPermission {
    token: string;
    amount: string;
}

/** Normalize a Permit2 `message.permitted` (single object or batch array) into an array. */
export function readPermittedEntries(primaryType: string, raw: unknown): Permit2TokenPermission[] {
    if (PERMIT2_BATCH_PRIMARY_TYPES.has(primaryType)) {
        return Array.isArray(raw) ? (raw as Permit2TokenPermission[]) : [];
    }
    if (
        PERMIT2_PRIMARY_TYPES.has(primaryType) &&
        raw !== null &&
        typeof raw === "object" &&
        "token" in raw
    ) {
        return [raw as Permit2TokenPermission];
    }
    return [];
}

/** Best-effort address parser: returns a checksummed Address or null if `raw` is not one. */
export function toAddressOrNull(raw: unknown): Address | null {
    return typeof raw === "string" && isAddress(raw) ? getAddress(raw) : null;
}
