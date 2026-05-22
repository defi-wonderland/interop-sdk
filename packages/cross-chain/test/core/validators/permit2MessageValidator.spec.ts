import { describe, expect, it } from "vitest";

import type { Eip712Envelope } from "../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { validatePermit2Message } from "../../../src/core/validators/permit2MessageValidator.js";

const PROVIDER = "test";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;
const OTHER_TOKEN = "0xdAC17F958D2ee523a2206206994597C13D831ec7" as `0x${string}`;
const SPENDER = "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10" as `0x${string}`;
const OTHER_SPENDER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`;
const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const PAST = Math.floor(Date.now() / 1000) - 3600;

function single(messageOverrides?: Record<string, unknown>): Eip712Envelope {
    return {
        domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS },
        primaryType: "PermitTransferFrom",
        types: {},
        message: {
            permitted: { token: TOKEN, amount: "1000000" },
            spender: SPENDER,
            nonce: "1",
            deadline: FUTURE,
            ...messageOverrides,
        },
    };
}

function batch(permitted: ReadonlyArray<{ token: string; amount: string }>): Eip712Envelope {
    return {
        domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS },
        primaryType: "PermitBatchTransferFrom",
        types: {},
        message: { permitted, spender: SPENDER, nonce: "1", deadline: FUTURE },
    };
}

const expected = {
    provider: PROVIDER,
    spender: SPENDER,
    inputToken: TOKEN,
    maxAmount: 1_000_000n,
};

describe("validatePermit2Message", () => {
    it("accepts a matching single envelope and a batch that sums to <= maxAmount", () => {
        expect(() => validatePermit2Message(single(), expected)).not.toThrow();
        expect(() =>
            validatePermit2Message(
                batch([
                    { token: TOKEN, amount: "400000" },
                    { token: TOKEN, amount: "600000" },
                ]),
                expected,
            ),
        ).not.toThrow();
    });

    it.each([
        // Defense-in-depth: a negative entry would let the batch total slip under maxAmount.
        [
            "negative batch entry",
            batch([
                { token: TOKEN, amount: "1000000000" },
                { token: TOKEN, amount: "-999999999" },
            ]),
            /amount/,
        ],
        [
            "batch total above maxAmount",
            batch([
                { token: TOKEN, amount: "400000" },
                { token: TOKEN, amount: "600000" },
            ]),
            /amount/,
            500_000n,
        ],
        [
            "tampered token",
            single({ permitted: { token: OTHER_TOKEN, amount: "1000000" } }),
            /token/,
        ],
        [
            "zero-amount input token with value diverted to a second token",
            batch([
                { token: TOKEN, amount: "0" },
                { token: OTHER_TOKEN, amount: "1000000" },
            ]),
            /token/,
        ],
        ["mismatched spender", single({ spender: OTHER_SPENDER }), /spender/],
        ["missing spender", single({ spender: undefined }), /spender/],
        ["expired deadline", single({ deadline: PAST }), /deadline/],
        ["empty permitted entries", single({ permitted: undefined }), /structure/],
    ])("rejects %s", (_, envelope, pattern, maxAmount) => {
        expect(() =>
            validatePermit2Message(envelope, {
                ...expected,
                maxAmount: maxAmount ?? expected.maxAmount,
            }),
        ).toThrowError(pattern as RegExp);
    });

    it("returns Eip712EnvelopeMismatch (not a raw viem error) for malformed input", () => {
        const e = single({ permitted: { token: "not-an-address", amount: "1" } });
        expect(() => validatePermit2Message(e, { provider: PROVIDER, spender: SPENDER })).toThrow(
            Eip712EnvelopeMismatch,
        );
    });
});
