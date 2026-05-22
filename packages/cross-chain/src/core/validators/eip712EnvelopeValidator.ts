import type { Address } from "viem";
import { getAddress, isAddressEqual } from "viem";

import type { Eip712Envelope, ExpectedEnvelope } from "../types/eip712.js";
import { PERMIT2_PRIMARY_TYPES } from "../constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";

/** Reject envelopes whose `primaryType` is not in the allow-list. */
export function validatePrimaryType(
    envelope: Eip712Envelope,
    allowed: ReadonlySet<string>,
    provider: string,
): void {
    if (!allowed.has(envelope.primaryType)) {
        throw new Eip712EnvelopeMismatch({
            field: "primaryType",
            provider,
            primaryType: envelope.primaryType,
            expected: [...allowed].join("|"),
            received: envelope.primaryType,
        });
    }
}

/** Validate `domain.chainId`, `domain.verifyingContract`, and disallow `domain.version` for Permit2. */
export function validateEnvelopeDomain(envelope: Eip712Envelope, expected: ExpectedEnvelope): void {
    if (expected.verifyingContracts.length === 0) {
        throw new Eip712EnvelopeMismatch({
            field: "structure",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            cause: "verifyingContracts allow-list is empty",
        });
    }

    const chainId = toChainId(envelope.domain.chainId);
    if (chainId === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "chainId",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: expected.chainId,
            received: String(envelope.domain.chainId),
        });
    }
    if (chainId !== expected.chainId) {
        throw new Eip712EnvelopeMismatch({
            field: "chainId",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: expected.chainId,
            received: chainId,
        });
    }

    const rawVerifying = envelope.domain.verifyingContract;
    if (typeof rawVerifying !== "string") {
        throw new Eip712EnvelopeMismatch({
            field: "verifyingContract",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: expected.verifyingContracts.join("|"),
            received: String(rawVerifying),
        });
    }

    let normalized: Address;
    try {
        normalized = getAddress(rawVerifying);
    } catch {
        throw new Eip712EnvelopeMismatch({
            field: "verifyingContract",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: expected.verifyingContracts.join("|"),
            received: rawVerifying,
        });
    }

    const matches = expected.verifyingContracts.some((candidate) =>
        isAddressEqual(normalized, candidate),
    );
    if (!matches) {
        throw new Eip712EnvelopeMismatch({
            field: "verifyingContract",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: expected.verifyingContracts.join("|"),
            received: normalized,
        });
    }

    // Permit2 EIP712Domain intentionally omits `version`. A populated value would change
    // the domain separator and is a tampering signal.
    if (PERMIT2_PRIMARY_TYPES.has(envelope.primaryType) && envelope.domain.version !== undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "domainVersion",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: "absent",
            received: String(envelope.domain.version),
        });
    }
}

function toChainId(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
    }
    if (typeof value === "bigint") {
        return value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : undefined;
    }
    if (typeof value !== "string" || value.length === 0) return undefined;
    let parsed: bigint;
    try {
        parsed = BigInt(value);
    } catch {
        return undefined;
    }
    return parsed >= 0n && parsed <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(parsed) : undefined;
}
