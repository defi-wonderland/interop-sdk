import { describe, expect, it } from "vitest";

import type { Eip712Envelope } from "../../../src/core/types/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { validateEip3009Message } from "../../../src/core/validators/eip3009MessageValidator.js";

const PROVIDER = "test";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const FUTURE = Math.floor(Date.now() / 1000) + 3600;

function envelope(overrides?: Partial<Eip712Envelope>): Eip712Envelope {
    return {
        domain: { name: "USD Coin", version: "2", chainId: 1, verifyingContract: TOKEN },
        primaryType: "TransferWithAuthorization",
        types: {},
        message: {
            from: USER,
            to: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
            value: "1000000",
            validAfter: 0,
            validBefore: FUTURE,
            nonce: "0xabcd",
        },
        ...overrides,
    };
}

describe("validateEip3009Message", () => {
    it("accepts a value supplied as a decimal string", () => {
        expect(() =>
            validateEip3009Message(envelope(), {
                provider: PROVIDER,
                user: USER as `0x${string}`,
                maxValue: 1_000_000n,
            }),
        ).not.toThrow();
    });

    it("accepts a value supplied as a bigint", () => {
        const e = envelope({
            message: {
                from: USER,
                to: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                value: 1_000_000n,
                validAfter: 0,
                validBefore: FUTURE,
                nonce: "0xabcd",
            },
        });
        expect(() =>
            validateEip3009Message(e, {
                provider: PROVIDER,
                user: USER as `0x${string}`,
                maxValue: 1_000_000n,
            }),
        ).not.toThrow();
    });

    it("accepts a safe-integer numeric value without precision loss", () => {
        const e = envelope({
            message: {
                from: USER,
                to: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                value: 1_000_000,
                validAfter: 0,
                validBefore: FUTURE,
                nonce: "0xabcd",
            },
        });
        expect(() =>
            validateEip3009Message(e, {
                provider: PROVIDER,
                user: USER as `0x${string}`,
                maxValue: 1_000_000n,
            }),
        ).not.toThrow();
    });

    it("rejects a fractional numeric value instead of truncating it", () => {
        const e = envelope({
            message: {
                from: USER,
                to: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                value: 1_000_000.5,
                validAfter: 0,
                validBefore: FUTURE,
                nonce: "0xabcd",
            },
        });
        expect(() =>
            validateEip3009Message(e, {
                provider: PROVIDER,
                user: USER as `0x${string}`,
                maxValue: 1_000_000n,
            }),
        ).toThrow(Eip712EnvelopeMismatch);
    });

    it("rejects a numeric value above Number.MAX_SAFE_INTEGER to avoid precision loss", () => {
        const e = envelope({
            message: {
                from: USER,
                to: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                value: 1e18,
                validAfter: 0,
                validBefore: FUTURE,
                nonce: "0xabcd",
            },
        });
        expect(() =>
            validateEip3009Message(e, {
                provider: PROVIDER,
                user: USER as `0x${string}`,
                maxValue: 2n * 10n ** 18n,
            }),
        ).toThrow(Eip712EnvelopeMismatch);
    });

    it("rejects a value above maxValue", () => {
        const e = envelope({
            message: {
                from: USER,
                to: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                value: "2000000",
                validAfter: 0,
                validBefore: FUTURE,
                nonce: "0xabcd",
            },
        });
        expect(() =>
            validateEip3009Message(e, {
                provider: PROVIDER,
                user: USER as `0x${string}`,
                maxValue: 1_000_000n,
            }),
        ).toThrowError(/amount/);
    });

    it("rejects a from address that does not match the user", () => {
        const e = envelope({
            message: {
                from: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                to: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                value: "1000000",
                validAfter: 0,
                validBefore: FUTURE,
                nonce: "0xabcd",
            },
        });
        expect(() =>
            validateEip3009Message(e, {
                provider: PROVIDER,
                user: USER as `0x${string}`,
                maxValue: 1_000_000n,
            }),
        ).toThrowError(/user/);
    });

    it("rejects an expired validBefore", () => {
        const e = envelope({
            message: {
                from: USER,
                to: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                value: "1000000",
                validAfter: 0,
                validBefore: Math.floor(Date.now() / 1000) - 3600,
                nonce: "0xabcd",
            },
        });
        expect(() =>
            validateEip3009Message(e, {
                provider: PROVIDER,
                user: USER as `0x${string}`,
                maxValue: 1_000_000n,
            }),
        ).toThrowError(/deadline/);
    });
});
