import { describe, expect, it } from "vitest";

import type { Eip712Envelope } from "../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { validatePermit2Message } from "../../../src/core/validators/permit2MessageValidator.js";

const PROVIDER = "test";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const PAST = Math.floor(Date.now() / 1000) - 3600;

function singleEnvelope(overrides?: Partial<Eip712Envelope>): Eip712Envelope {
    return {
        domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS },
        primaryType: "PermitTransferFrom",
        types: {},
        message: {
            permitted: { token: TOKEN, amount: "1000000" },
            spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
            nonce: "1",
            deadline: FUTURE,
        },
        ...overrides,
    };
}

function batchEnvelope(overrides?: Partial<Eip712Envelope>): Eip712Envelope {
    return {
        domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS },
        primaryType: "PermitBatchTransferFrom",
        types: {},
        message: {
            permitted: [
                { token: TOKEN, amount: "400000" },
                { token: TOKEN, amount: "600000" },
            ],
            spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
            nonce: "1",
            deadline: FUTURE,
        },
        ...overrides,
    };
}

describe("validatePermit2Message", () => {
    it("accepts a matching envelope", () => {
        expect(() =>
            validatePermit2Message(singleEnvelope(), {
                provider: PROVIDER,
                inputToken: TOKEN as `0x${string}`,
                maxAmount: 1_000_000n,
            }),
        ).not.toThrow();
    });

    it("accepts an amount lower than the requested maximum", () => {
        const envelope = singleEnvelope({
            message: {
                permitted: { token: TOKEN, amount: "500000" },
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: FUTURE,
            },
        });
        expect(() =>
            validatePermit2Message(envelope, {
                provider: PROVIDER,
                inputToken: TOKEN as `0x${string}`,
                maxAmount: 1_000_000n,
            }),
        ).not.toThrow();
    });

    it("rejects an inflated total amount across batch entries", () => {
        expect(() =>
            validatePermit2Message(batchEnvelope(), {
                provider: PROVIDER,
                inputToken: TOKEN as `0x${string}`,
                maxAmount: 500_000n,
            }),
        ).toThrowError(/amount/);
    });

    it("rejects a tampered token", () => {
        const envelope = singleEnvelope({
            message: {
                permitted: {
                    token: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                    amount: "1000000",
                },
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: FUTURE,
            },
        });
        expect(() =>
            validatePermit2Message(envelope, {
                provider: PROVIDER,
                inputToken: TOKEN as `0x${string}`,
            }),
        ).toThrowError(/token/);
    });

    it("rejects an expired deadline", () => {
        const envelope = singleEnvelope({
            message: {
                permitted: { token: TOKEN, amount: "1000000" },
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: PAST,
            },
        });
        expect(() => validatePermit2Message(envelope, { provider: PROVIDER })).toThrowError(
            /deadline/,
        );
    });

    it("rejects an envelope with empty permitted entries", () => {
        const envelope = singleEnvelope({
            message: {
                permitted: undefined,
                deadline: FUTURE,
            },
        });
        expect(() => validatePermit2Message(envelope, { provider: PROVIDER })).toThrow(
            Eip712EnvelopeMismatch,
        );
    });

    it("rejects a batch entry whose token differs from inputToken", () => {
        const OTHER_TOKEN = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
        const envelope = batchEnvelope({
            message: {
                permitted: [
                    { token: TOKEN, amount: "400000" },
                    { token: OTHER_TOKEN, amount: "600000" },
                ],
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: FUTURE,
            },
        });
        expect(() =>
            validatePermit2Message(envelope, {
                provider: PROVIDER,
                inputToken: TOKEN as `0x${string}`,
                maxAmount: 1_000_000n,
            }),
        ).toThrowError(/token/);
    });

    it("rejects a batch with the input token at amount zero and another token carrying the value", () => {
        const OTHER_TOKEN = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
        const envelope = batchEnvelope({
            message: {
                permitted: [
                    { token: TOKEN, amount: "0" },
                    { token: OTHER_TOKEN, amount: "1000000" },
                ],
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: FUTURE,
            },
        });
        expect(() =>
            validatePermit2Message(envelope, {
                provider: PROVIDER,
                inputToken: TOKEN as `0x${string}`,
                maxAmount: 1_000_000n,
            }),
        ).toThrowError(/token/);
    });

    it("accepts a batch where all entries use the input token and the total respects maxAmount", () => {
        expect(() =>
            validatePermit2Message(batchEnvelope(), {
                provider: PROVIDER,
                inputToken: TOKEN as `0x${string}`,
                maxAmount: 1_000_000n,
            }),
        ).not.toThrow();
    });
});
