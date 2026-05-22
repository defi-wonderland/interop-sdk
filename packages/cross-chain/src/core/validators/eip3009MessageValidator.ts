import type { Eip712Envelope, ExpectedEip3009Message } from "../types/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";
import { readAddressField } from "../utils/eip712Readers.js";
import { assertNotExpired, assertNotPostDated } from "../utils/expiry.js";
import { toNonNegativeBigInt } from "../utils/toNonNegativeBigInt.js";

/**
 * Validate `from`, `to`, `value`, `validAfter`, and `validBefore` against the
 * user intent.
 *
 * Composability note: callers must also run {@link validatePrimaryType} and
 * {@link validateEnvelopeDomain} — this validator does not cross-check
 * `chainId`, the contract allow-list, or `domain.version`.
 */
export function validateEip3009Message(
    envelope: Eip712Envelope,
    expected: ExpectedEip3009Message,
): void {
    readAddressField({
        envelope,
        path: ["from"],
        field: "user",
        provider: expected.provider,
        expected: expected.user,
    });
    readAddressField({
        envelope,
        path: ["to"],
        field: "to",
        provider: expected.provider,
        expected: expected.to,
    });
    assertValueWithinLimit(envelope, expected);
    assertNotPostDated({
        timestamp: envelope.message.validAfter,
        skewSeconds: expected.skewSeconds,
        provider: expected.provider,
        primaryType: envelope.primaryType,
    });
    assertNotExpired({
        timestamp: envelope.message.validBefore,
        skewSeconds: expected.skewSeconds,
        provider: expected.provider,
        primaryType: envelope.primaryType,
    });
}

function assertValueWithinLimit(envelope: Eip712Envelope, expected: ExpectedEip3009Message): void {
    if (expected.maxValue === undefined) return;
    const value = toNonNegativeBigInt(envelope.message.value);
    if (value === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "amount",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            received: String(envelope.message.value),
        });
    }
    if (value > expected.maxValue) {
        throw new Eip712EnvelopeMismatch({
            field: "amount",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: expected.maxValue,
            received: value,
        });
    }
}
