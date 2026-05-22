import type { Address } from "viem";
import { getAddress, hexToBigInt, isAddressEqual, isHex } from "viem";

import type { Eip712Envelope, ExpectedEnvelope } from "../types/eip712.js";
import { PERMIT2_PRIMARY_TYPES } from "../constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";

const DECIMAL_CHAIN_ID = /^\d+$/;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function errorMessage(error: unknown): string | undefined {
    return error instanceof Error ? error.message : undefined;
}

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
    } catch (error) {
        throw new Eip712EnvelopeMismatch({
            field: "verifyingContract",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: expected.verifyingContracts.join("|"),
            received: rawVerifying,
            cause: errorMessage(error),
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

    // Permit2 EIP712Domain intentionally omits `version` and `salt`. Either populated
    // would change the domain separator and is a tampering signal.
    if (PERMIT2_PRIMARY_TYPES.has(envelope.primaryType)) {
        if (envelope.domain.version !== undefined) {
            throw new Eip712EnvelopeMismatch({
                field: "domainVersion",
                provider: expected.provider,
                primaryType: envelope.primaryType,
                expected: "absent",
                received: String(envelope.domain.version),
            });
        }
        if (envelope.domain.salt !== undefined) {
            throw new Eip712EnvelopeMismatch({
                field: "structure",
                provider: expected.provider,
                primaryType: envelope.primaryType,
                expected: "absent",
                received: String(envelope.domain.salt),
                cause: "Permit2 domain.salt must be absent",
            });
        }
    }
}

function toChainId(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
    }
    if (typeof value === "bigint") {
        return value >= 0n && value <= MAX_SAFE_BIGINT ? Number(value) : undefined;
    }
    if (typeof value !== "string" || value.length === 0) return undefined;
    let parsed: bigint;
    if (isHex(value)) {
        if (value.length <= 2) return undefined;
        parsed = hexToBigInt(value);
    } else if (DECIMAL_CHAIN_ID.test(value)) {
        parsed = BigInt(value);
    } else {
        return undefined;
    }
    return parsed <= MAX_SAFE_BIGINT ? Number(parsed) : undefined;
}
