import { getAddress, isAddressEqual } from "viem";

import type { Eip712Envelope, ExpectedEnvelope } from "../types/eip712.js";
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

/** Validate `domain.chainId` and `domain.verifyingContract` against the caller's expectations. */
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
    if (chainId === undefined || chainId !== expected.chainId) {
        throw new Eip712EnvelopeMismatch({
            field: "chainId",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: expected.chainId,
            received: chainId ?? String(envelope.domain.chainId),
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

    const normalized = getAddress(rawVerifying);
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
}

function toChainId(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
    }
    let parsed: bigint;
    if (typeof value === "bigint") {
        parsed = value;
    } else if (typeof value === "string" && value.length > 0) {
        try {
            parsed = BigInt(value);
        } catch {
            return undefined;
        }
    } else {
        return undefined;
    }
    if (parsed < 0n) return undefined;
    const asNumber = Number(parsed);
    return Number.isSafeInteger(asNumber) ? asNumber : undefined;
}
