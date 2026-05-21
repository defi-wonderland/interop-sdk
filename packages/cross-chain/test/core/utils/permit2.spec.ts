import { describe, expect, it } from "vitest";

import type { Eip712Envelope } from "../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { assertDeadlineFresh, readPermittedEntries } from "../../../src/core/utils/permit2.js";

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

describe("readPermittedEntries", () => {
    it("normalizes the single PermitTransferFrom shape to an array", () => {
        const entries = readPermittedEntries(singleEnvelope());
        expect(entries).toHaveLength(1);
        expect(entries[0]!.token.toLowerCase()).toBe(TOKEN.toLowerCase());
        expect(entries[0]!.amount).toBe(1_000_000n);
    });

    it("reads the batch PermitBatchTransferFrom shape directly", () => {
        const entries = readPermittedEntries(batchEnvelope());
        expect(entries).toHaveLength(2);
        expect(entries[0]!.amount).toBe(400_000n);
        expect(entries[1]!.amount).toBe(600_000n);
    });

    it("returns an empty array for unknown primaryTypes", () => {
        const envelope = singleEnvelope({ primaryType: "Foo" });
        expect(readPermittedEntries(envelope)).toEqual([]);
    });

    it("throws Eip712EnvelopeMismatch (not InvalidAddressError) for a malformed token", () => {
        const envelope = singleEnvelope({
            message: {
                permitted: { token: "not-an-address", amount: "1" },
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: FUTURE,
            },
        });
        expect(() => readPermittedEntries(envelope)).toThrow(Eip712EnvelopeMismatch);
    });

    it("throws Eip712EnvelopeMismatch (not SyntaxError) for a non-numeric amount", () => {
        const envelope = singleEnvelope({
            message: {
                permitted: { token: TOKEN, amount: "not-a-number" },
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: FUTURE,
            },
        });
        expect(() => readPermittedEntries(envelope)).toThrow(Eip712EnvelopeMismatch);
    });

    it("throws Eip712EnvelopeMismatch when batch permitted is not an array", () => {
        const envelope = batchEnvelope({
            message: {
                permitted: { token: TOKEN, amount: "1" },
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: FUTURE,
            },
        });
        expect(() => readPermittedEntries(envelope)).toThrow(Eip712EnvelopeMismatch);
    });

    it("throws Eip712EnvelopeMismatch when single permitted is not an object", () => {
        const envelope = singleEnvelope({
            message: {
                permitted: [{ token: TOKEN, amount: "1" }],
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: FUTURE,
            },
        });
        expect(() => readPermittedEntries(envelope)).toThrow(Eip712EnvelopeMismatch);
    });

    it("throws Eip712EnvelopeMismatch when batch permitted is a primitive", () => {
        const envelope = batchEnvelope({
            message: {
                permitted: "not-an-array",
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: FUTURE,
            },
        });
        expect(() => readPermittedEntries(envelope)).toThrow(Eip712EnvelopeMismatch);
    });
});

describe("assertDeadlineFresh", () => {
    it("accepts a future deadline", () => {
        expect(() =>
            assertDeadlineFresh({
                deadline: FUTURE,
                provider: PROVIDER,
                primaryType: "PermitTransferFrom",
            }),
        ).not.toThrow();
    });

    it("rejects a missing deadline", () => {
        expect(() =>
            assertDeadlineFresh({
                deadline: undefined,
                provider: PROVIDER,
                primaryType: "PermitTransferFrom",
            }),
        ).toThrowError(/deadline/);
    });

    it("rejects an expired deadline", () => {
        expect(() =>
            assertDeadlineFresh({
                deadline: PAST,
                provider: PROVIDER,
                primaryType: "PermitTransferFrom",
            }),
        ).toThrowError(/deadline/);
    });
});
