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
        if (typeof raw !== "object" || Array.isArray(raw)) {
            throw new Eip712EnvelopeMismatch({
                field: "structure",
                provider,
                primaryType: envelope.primaryType,
                cause: "permitted must be an object",
            });
        }
        return [toPermittedEntry(raw, envelope.primaryType, provider)];
    }
    if (PERMIT2_BATCH_PRIMARY_TYPES.has(envelope.primaryType)) {
        if (raw === undefined || raw === null) return [];
        if (!Array.isArray(raw)) {
            throw new Eip712EnvelopeMismatch({
                field: "structure",
                provider,
                primaryType: envelope.primaryType,
                cause: "permitted must be an array",
            });
        }
        return raw.map((entry) => toPermittedEntry(entry, envelope.primaryType, provider));
    }
    return [];
}

function toPermittedEntry(raw: unknown, primaryType: string, provider: string): PermittedEntry {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Eip712EnvelopeMismatch({
            field: "structure",
            provider,
            primaryType,
            received: String(raw),
            cause: "permitted entry must be an object",
        });
    }
    const entry = raw as RawTokenPermission;
    if (typeof entry.token !== "string") {
        throw new Eip712EnvelopeMismatch({
            field: "token",
            provider,
            primaryType,
            received: String(entry.token),
        });
    }
    let token: Address;
    try {
        token = getAddress(entry.token);
    } catch (error) {
        throw new Eip712EnvelopeMismatch({
            field: "token",
            provider,
            primaryType,
            received: entry.token,
            cause: error instanceof Error ? error.message : undefined,
        });
    }
    if (entry.amount === undefined || entry.amount === null) {
        throw new Eip712EnvelopeMismatch({
            field: "amount",
            provider,
            primaryType,
            received: String(entry.amount),
            cause: "amount field is required",
        });
    }
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
