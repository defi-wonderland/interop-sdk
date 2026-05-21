import type { Address } from "viem";

import type { Eip712Envelope, ExpectedEip3009Message } from "../types/eip712.js";
import { DEFAULT_DEADLINE_SKEW_SECONDS } from "../constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";
import { parseBigint, parseUnixSeconds } from "../utils/eip712Parsers.js";
import { readAddressField } from "../utils/eip712Readers.js";

/** Validate the EIP-3009 message fields (`from`, `value`, `validBefore`) against the user intent. */
export function validateEip3009Message(
    envelope: Eip712Envelope,
    expected: ExpectedEip3009Message,
): void {
    assertFromMatchesUser(envelope, expected.user, expected.provider);
    assertValueWithinLimit(envelope, expected);
    assertValidBeforeFresh(envelope, expected);
}

function assertFromMatchesUser(envelope: Eip712Envelope, user: Address, provider: string): void {
    readAddressField({
        envelope,
        path: ["from"],
        field: "user",
        provider,
        expected: user,
    });
}

function assertValueWithinLimit(envelope: Eip712Envelope, expected: ExpectedEip3009Message): void {
    if (expected.maxValue === undefined) return;
    const value = parseBigint(envelope.message.value);
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

function assertValidBeforeFresh(envelope: Eip712Envelope, expected: ExpectedEip3009Message): void {
    const validBefore = parseUnixSeconds(envelope.message.validBefore);
    if (validBefore === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "deadline",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            received: String(envelope.message.validBefore),
        });
    }
    const skew = expected.skewSeconds ?? DEFAULT_DEADLINE_SKEW_SECONDS;
    const now = Math.floor(Date.now() / 1000);
    if (validBefore < now - skew) {
        throw new Eip712EnvelopeMismatch({
            field: "deadline",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: `>=${now - skew}`,
            received: validBefore,
        });
    }
}
