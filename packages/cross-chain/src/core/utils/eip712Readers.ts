import type { Address } from "viem";
import { getAddress, isAddressEqual } from "viem";

import type { Eip712MismatchField } from "../errors/Eip712EnvelopeMismatch.exception.js";
import type { Eip712Domain, Eip712Envelope } from "../types/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";
import { isNativeAddress } from "./token.js";

interface ReadAddressFieldArgs {
    envelope: Eip712Envelope;
    path: ReadonlyArray<string>;
    field: Eip712MismatchField;
    provider: string;
    expected?: Address;
}

/**
 * Read an Address-typed field from inside `envelope.message` (e.g. `witness.receiver`).
 * Throws {@link Eip712EnvelopeMismatch} if the path is absent, not a string,
 * not a valid address, or — when `expected` is supplied — does not match.
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
            cause: raw === undefined ? `missing field at ${path.join(".")}` : undefined,
        });
    }

    let normalized: Address;
    try {
        normalized = getAddress(raw);
    } catch {
        throw new Eip712EnvelopeMismatch({
            field,
            provider,
            primaryType: envelope.primaryType,
            expected,
            received: raw,
        });
    }

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

/**
 * Reject signature flows that would attempt to authorize the native asset.
 * Permit2 and EIP-3009 are ERC-20 mechanisms — the native asset placeholder
 * has no token contract to forward the allowance.
 */
export function assertNotNativeAsset(args: {
    assetAddress: string;
    provider: string;
    primaryType: string;
    mechanism: "Permit2" | "EIP-3009";
}): void {
    if (!isNativeAddress(args.assetAddress, "eip155")) return;
    throw new Eip712EnvelopeMismatch({
        field: "token",
        provider: args.provider,
        primaryType: args.primaryType,
        cause: `${args.mechanism} cannot authorize native asset transfers`,
    });
}

/**
 * EIP-3009 domains carry the token's `version` (e.g., USDC = "2"). An empty or
 * missing value changes the domain separator and is a tampering signal.
 */
export function assertEip3009DomainVersion(envelope: Eip712Envelope, provider: string): void {
    const version: Eip712Domain["version"] = envelope.domain.version;
    if (typeof version === "string" && version.length > 0) return;
    throw new Eip712EnvelopeMismatch({
        field: "domainVersion",
        provider,
        primaryType: envelope.primaryType,
        expected: "non-empty string",
        received: String(version),
    });
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
