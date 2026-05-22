import type { Address } from "viem";
import { getAddress, isAddressEqual } from "viem";

import type { Eip712MismatchField } from "../errors/Eip712EnvelopeMismatch.exception.js";
import type { Eip712Envelope } from "../types/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";

interface ReadAddressFieldArgs {
    envelope: Eip712Envelope;
    path: ReadonlyArray<string>;
    field: Eip712MismatchField;
    provider: string;
    expected?: Address;
}

/**
 * Read an Address-typed field from inside `envelope.message` (e.g. `witness.receiver`)
 * and, when `expected` is supplied, assert it matches.
 */
export function readAddressField(args: ReadAddressFieldArgs): Address {
    const { envelope, path, field, provider, expected } = args;

    const raw = readAtPath(envelope.message, path);
    if (typeof raw !== "string") {
        throw new Eip712EnvelopeMismatch({
            field,
            provider,
            primaryType: envelope.primaryType,
            expected,
            received: String(raw),
        });
    }

    const normalized = getAddress(raw);
    if (expected !== undefined && !isAddressEqual(normalized, expected)) {
        throw new Eip712EnvelopeMismatch({
            field,
            provider,
            primaryType: envelope.primaryType,
            expected,
            received: normalized,
        });
    }
    return normalized;
}

function readAtPath(source: Record<string, unknown>, path: ReadonlyArray<string>): unknown {
    let current: unknown = source;
    for (const key of path) {
        if (current === null || typeof current !== "object" || Array.isArray(current)) {
            return undefined;
        }
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}
