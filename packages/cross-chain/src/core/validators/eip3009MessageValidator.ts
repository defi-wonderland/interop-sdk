import { getAddress, isAddressEqual } from "viem";

import type { Eip712Envelope, ExpectedEip3009Message } from "../types/eip712.js";
import { DEFAULT_DEADLINE_SKEW_SECONDS } from "../constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";

/** Validate the EIP-3009 message fields (`from`, `value`, `validBefore`) against the user intent. */
export function validateEip3009Message(
    envelope: Eip712Envelope,
    expected: ExpectedEip3009Message,
): void {
    assertFromMatchesUser(envelope, expected);
    assertValueWithinLimit(envelope, expected);
    assertValidBeforeFresh(envelope, expected);
}

function assertFromMatchesUser(envelope: Eip712Envelope, expected: ExpectedEip3009Message): void {
    const rawFrom = envelope.message.from;
    if (typeof rawFrom !== "string") {
        throw new Eip712EnvelopeMismatch({
            field: "user",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            received: String(rawFrom),
        });
    }
    let normalizedFrom: ReturnType<typeof getAddress>;
    try {
        normalizedFrom = getAddress(rawFrom);
    } catch {
        throw new Eip712EnvelopeMismatch({
            field: "user",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: expected.user,
            received: rawFrom,
        });
    }
    if (!isAddressEqual(normalizedFrom, expected.user)) {
        throw new Eip712EnvelopeMismatch({
            field: "user",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            expected: expected.user,
            received: rawFrom,
        });
    }
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
            expected: expected.maxValue.toString(),
            received: value.toString(),
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

function parseBigint(value: unknown): bigint | undefined {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") {
        return Number.isSafeInteger(value) ? BigInt(value) : undefined;
    }
    if (typeof value === "string" && value.length > 0) {
        try {
            return BigInt(value);
        } catch {
            return undefined;
        }
    }
    return undefined;
}

function parseUnixSeconds(value: unknown): number | undefined {
    if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        Number.isInteger(value) &&
        value > 0
    ) {
        return value;
    }
    if (typeof value === "bigint" && value > 0n) {
        if (value > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
        return Number(value);
    }
    if (typeof value === "string" && value.length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0) return parsed;
    }
    return undefined;
}
