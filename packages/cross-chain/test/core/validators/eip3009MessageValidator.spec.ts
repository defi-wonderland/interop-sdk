import { describe, expect, it } from "vitest";

import type { Eip712Envelope } from "../../../src/core/types/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { validateEip3009Message } from "../../../src/core/validators/eip3009MessageValidator.js";

const PROVIDER = "test";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`;
const TO = "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10";
const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const PAST = Math.floor(Date.now() / 1000) - 3600;
const MAX = 1_000_000n;

function envelope(messageOverrides?: Record<string, unknown>): Eip712Envelope {
    return {
        domain: { name: "USD Coin", version: "2", chainId: 1, verifyingContract: TOKEN },
        primaryType: "TransferWithAuthorization",
        types: {},
        message: {
            from: USER,
            to: TO,
            value: "1000000",
            validAfter: 0,
            validBefore: FUTURE,
            nonce: "0xabcd",
            ...messageOverrides,
        },
    };
}

const expected = { provider: PROVIDER, user: USER, maxValue: MAX };

describe("validateEip3009Message", () => {
    it.each([
        ["decimal string", "1000000"],
        ["bigint", 1_000_000n],
        ["safe-integer number", 1_000_000],
    ])("accepts a value supplied as %s", (_, value) => {
        expect(() => validateEip3009Message(envelope({ value }), expected)).not.toThrow();
    });

    it.each([
        // Defense-in-depth for the maxValue bypass: negative amounts must be rejected before the
        // `value > maxValue` comparison can be tricked into approving them.
        ["negative bigint", -1n],
        ["negative string", "-1"],
        ["fractional number", 1_000_000.5],
        ["above MAX_SAFE_INTEGER", 1e18],
        ["above maxValue cap", "2000000"],
    ])("rejects an invalid value (%s)", (_, value) => {
        expect(() => validateEip3009Message(envelope({ value }), expected)).toThrowError(/amount/);
    });

    it("rejects a from address that does not match the user", () => {
        const e = envelope({ from: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" });
        expect(() => validateEip3009Message(e, expected)).toThrowError(/user/);
    });

    it("rejects an expired validBefore", () => {
        expect(() =>
            validateEip3009Message(envelope({ validBefore: PAST }), expected),
        ).toThrowError(/deadline/);
    });

    it("returns Eip712EnvelopeMismatch (not a raw viem error) for malformed input", () => {
        expect(() =>
            validateEip3009Message(envelope({ from: "not-an-address" }), expected),
        ).toThrow(Eip712EnvelopeMismatch);
    });
});
