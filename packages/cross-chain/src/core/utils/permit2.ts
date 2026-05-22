import type { Address } from "viem";
import { getAddress } from "viem";

import type { Eip712Envelope, PermittedEntry } from "../types/eip712.js";
import { PERMIT2_BATCH_PRIMARY_TYPES, PERMIT2_SINGLE_PRIMARY_TYPES } from "../constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";
import { toNonNegativeBigInt } from "./toNonNegativeBigInt.js";

interface RawTokenPermission {
    token?: unknown;
    amount?: unknown;
}

/** Normalize Permit2's `permitted` field (single or batch) into a typed array. */
export function readPermittedEntries(envelope: Eip712Envelope, provider: string): PermittedEntry[] {
    const raw = envelope.message.permitted;
    if (PERMIT2_SINGLE_PRIMARY_TYPES.has(envelope.primaryType)) {
        if (raw === undefined || raw === null) return [];
        return [toPermittedEntry(raw as RawTokenPermission, envelope.primaryType, provider)];
    }
    if (PERMIT2_BATCH_PRIMARY_TYPES.has(envelope.primaryType)) {
        if (!Array.isArray(raw)) return [];
        return raw.map((entry) => toPermittedEntry(entry, envelope.primaryType, provider));
    }
    return [];
}

function toPermittedEntry(raw: unknown, primaryType: string, provider: string): PermittedEntry {
    const entry = (raw ?? {}) as RawTokenPermission;
    const token: Address = getAddress(entry.token as string);
    const amount = toNonNegativeBigInt(entry.amount);
    if (amount === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "amount",
            provider,
            primaryType,
            received: String(entry.amount),
        });
    }
    return { token, amount };
}
