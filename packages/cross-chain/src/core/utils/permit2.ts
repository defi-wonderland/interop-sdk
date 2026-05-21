import type { Address } from "viem";
import { getAddress } from "viem";

import type { Eip712Envelope, PermittedEntry } from "../types/eip712.js";
import {
    DEFAULT_DEADLINE_SKEW_SECONDS,
    PERMIT2_BATCH_PRIMARY_TYPES,
    PERMIT2_SINGLE_PRIMARY_TYPES,
} from "../constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";
import { parseBigint, parseUnixSeconds } from "./eip712Parsers.js";

interface RawTokenPermission {
    token?: unknown;
    amount?: unknown;
}

/** Normalize Permit2's `permitted` field (single or batch) into a typed array. */
export function readPermittedEntries(envelope: Eip712Envelope): PermittedEntry[] {
    const raw = envelope.message.permitted;
    if (PERMIT2_SINGLE_PRIMARY_TYPES.has(envelope.primaryType)) {
        if (raw === undefined || raw === null) return [];
        if (typeof raw !== "object" || Array.isArray(raw)) {
            throw new Eip712EnvelopeMismatch({
                field: "structure",
                provider: "permit2",
                primaryType: envelope.primaryType,
                cause: "permitted must be an object",
            });
        }
        return [toPermittedEntry(raw as RawTokenPermission)];
    }
    if (PERMIT2_BATCH_PRIMARY_TYPES.has(envelope.primaryType)) {
        if (raw === undefined || raw === null) return [];
        if (!Array.isArray(raw)) {
            throw new Eip712EnvelopeMismatch({
                field: "structure",
                provider: "permit2",
                primaryType: envelope.primaryType,
                cause: "permitted must be an array",
            });
        }
        return (raw as RawTokenPermission[]).map(toPermittedEntry);
    }
    return [];
}

/** Reject `deadline` values that are missing, malformed, or already expired (with skew tolerance). */
export function assertDeadlineFresh(args: {
    deadline: unknown;
    provider: string;
    primaryType: string;
    skewSeconds?: number;
}): void {
    const parsed = parseUnixSeconds(args.deadline);
    if (parsed === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "deadline",
            provider: args.provider,
            primaryType: args.primaryType,
            received: String(args.deadline),
        });
    }

    const skew = args.skewSeconds ?? DEFAULT_DEADLINE_SKEW_SECONDS;
    const now = Math.floor(Date.now() / 1000);
    if (parsed < now - skew) {
        throw new Eip712EnvelopeMismatch({
            field: "deadline",
            provider: args.provider,
            primaryType: args.primaryType,
            expected: `>=${now - skew}`,
            received: parsed,
        });
    }
}

function toPermittedEntry(raw: RawTokenPermission): PermittedEntry {
    if (typeof raw.token !== "string") {
        throw new Eip712EnvelopeMismatch({
            field: "token",
            provider: "permit2",
            received: String(raw.token),
        });
    }
    let token: Address;
    try {
        token = getAddress(raw.token);
    } catch {
        throw new Eip712EnvelopeMismatch({
            field: "token",
            provider: "permit2",
            received: raw.token,
        });
    }
    const amount = parseBigint(raw.amount ?? "0");
    if (amount === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "amount",
            provider: "permit2",
            received: String(raw.amount),
        });
    }
    return { token, amount };
}
