import { describe, expect, it } from "vitest";

import type { Eip712Envelope } from "../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { assertDeadlineFresh, readPermittedEntries } from "../../../src/core/utils/permit2.js";

const PROVIDER = "test";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const SPENDER = "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10";
const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const PAST = Math.floor(Date.now() / 1000) - 3600;

function envelope(primaryType: string, permitted: unknown): Eip712Envelope {
    return {
        domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS },
        primaryType,
        types: {},
        message: { permitted, spender: SPENDER, nonce: "1", deadline: FUTURE },
    };
}

describe("readPermittedEntries", () => {
    it("normalizes both single and batch shapes", () => {
        const singleEntries = readPermittedEntries(
            envelope("PermitTransferFrom", { token: TOKEN, amount: "1000000" }),
        );
        expect(singleEntries).toHaveLength(1);
        expect(singleEntries[0]!.amount).toBe(1_000_000n);

        const batchEntries = readPermittedEntries(
            envelope("PermitBatchTransferFrom", [
                { token: TOKEN, amount: "400000" },
                { token: TOKEN, amount: "600000" },
            ]),
        );
        expect(batchEntries.map((e) => e.amount)).toEqual([400_000n, 600_000n]);
    });

    it("returns an empty array for unknown primaryTypes", () => {
        expect(readPermittedEntries(envelope("Foo", { token: TOKEN, amount: "1" }))).toEqual([]);
    });

    it.each([
        [
            "batch permitted is not an array",
            "PermitBatchTransferFrom",
            { token: TOKEN, amount: "1" },
        ],
        [
            "single permitted is not an object",
            "PermitTransferFrom",
            [{ token: TOKEN, amount: "1" }],
        ],
        ["malformed token", "PermitTransferFrom", { token: "not-an-address", amount: "1" }],
        ["non-numeric amount", "PermitTransferFrom", { token: TOKEN, amount: "not-a-number" }],
        // Defense-in-depth for the maxAmount bypass: a negative entry would let the total
        // sum under the cap while a sibling entry exfiltrates the difference.
        ["negative amount", "PermitTransferFrom", { token: TOKEN, amount: "-1" }],
    ])("throws Eip712EnvelopeMismatch on %s", (_, primaryType, permitted) => {
        expect(() => readPermittedEntries(envelope(primaryType, permitted))).toThrow(
            Eip712EnvelopeMismatch,
        );
    });
});

describe("assertDeadlineFresh", () => {
    it("accepts a future deadline and rejects missing/expired values", () => {
        expect(() =>
            assertDeadlineFresh({
                deadline: FUTURE,
                provider: PROVIDER,
                primaryType: "PermitTransferFrom",
            }),
        ).not.toThrow();
        for (const bad of [undefined, PAST]) {
            expect(() =>
                assertDeadlineFresh({
                    deadline: bad,
                    provider: PROVIDER,
                    primaryType: "PermitTransferFrom",
                }),
            ).toThrowError(/deadline/);
        }
    });
});
