import { describe, expect, it } from "vitest";

import type { Eip712Envelope } from "../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import {
    validateEnvelopeDomain,
    validatePrimaryType,
} from "../../../src/core/validators/eip712EnvelopeValidator.js";

const PROVIDER = "test";

function envelope(overrides?: Partial<Eip712Envelope>): Eip712Envelope {
    return {
        domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS },
        primaryType: "PermitTransferFrom",
        types: {},
        message: {},
        ...overrides,
    };
}

describe("validatePrimaryType", () => {
    const allowed = new Set(["PermitTransferFrom"]);

    it("accepts allow-listed primaryTypes and rejects everything else (case-sensitive)", () => {
        expect(() => validatePrimaryType(envelope(), allowed, PROVIDER)).not.toThrow();
        for (const bad of ["Foo", "permitTransferFrom"]) {
            expect(() =>
                validatePrimaryType(envelope({ primaryType: bad }), allowed, PROVIDER),
            ).toThrow(Eip712EnvelopeMismatch);
        }
    });
});

describe("validateEnvelopeDomain", () => {
    const expected = {
        chainId: 1,
        verifyingContracts: [PERMIT2_ADDRESS],
        provider: PROVIDER,
    };

    it.each([
        ["number", 1],
        ["decimal string", "1"],
        ["hex string", "0x1"],
        ["bigint", 1n],
    ])("accepts chainId as %s", (_, chainId) => {
        const e = envelope({ domain: { chainId, verifyingContract: PERMIT2_ADDRESS } });
        expect(() => validateEnvelopeDomain(e, expected)).not.toThrow();
    });

    it.each([
        ["mismatched chainId", { chainId: 137, verifyingContract: PERMIT2_ADDRESS }],
        ["malformed chainId", { chainId: "abc", verifyingContract: PERMIT2_ADDRESS }],
        ["missing chainId", { verifyingContract: PERMIT2_ADDRESS }],
        // Strict parser: each of these would have slipped past a permissive Number() or bare BigInt().
        ["scientific notation", { chainId: "1e10", verifyingContract: PERMIT2_ADDRESS }],
        ["hex with non-hex chars", { chainId: "0x1ZZZ", verifyingContract: PERMIT2_ADDRESS }],
        ["whitespace-padded chainId", { chainId: " 1 ", verifyingContract: PERMIT2_ADDRESS }],
        ["uppercase 0X hex chainId", { chainId: "0X1", verifyingContract: PERMIT2_ADDRESS }],
        ["binary prefix chainId", { chainId: "0b1", verifyingContract: PERMIT2_ADDRESS }],
        ["octal prefix chainId", { chainId: "0o7", verifyingContract: PERMIT2_ADDRESS }],
        ["bare 0x with no digits", { chainId: "0x", verifyingContract: PERMIT2_ADDRESS }],
        ["fractional chainId", { chainId: 1.5, verifyingContract: PERMIT2_ADDRESS }],
        ["negative chainId", { chainId: -1, verifyingContract: PERMIT2_ADDRESS }],
        [
            "chainId above MAX_SAFE_INTEGER",
            { chainId: BigInt(Number.MAX_SAFE_INTEGER) + 1n, verifyingContract: PERMIT2_ADDRESS },
        ],
        [
            "non-canonical verifyingContract",
            { chainId: 1, verifyingContract: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" },
        ],
    ])("rejects %s", (_, domain) => {
        expect(() => validateEnvelopeDomain(envelope({ domain }), expected)).toThrow(
            Eip712EnvelopeMismatch,
        );
    });

    it("accepts a lowercase verifyingContract and rejects an empty allow-list", () => {
        const lowercase = envelope({
            domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS.toLowerCase() },
        });
        expect(() => validateEnvelopeDomain(lowercase, expected)).not.toThrow();
        expect(() =>
            validateEnvelopeDomain(envelope(), { ...expected, verifyingContracts: [] }),
        ).toThrowError(/verifyingContracts allow-list is empty/);
    });

    it("rejects a Permit2 envelope that carries a domain.version", () => {
        const e = envelope({
            domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS, version: "1" },
        });
        expect(() => validateEnvelopeDomain(e, expected)).toThrowError(/domainVersion/);
    });

    it("rejects a Permit2 envelope that carries a domain.salt", () => {
        const e = envelope({
            domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS, salt: "0xdead" },
        });
        expect(() => validateEnvelopeDomain(e, expected)).toThrowError(/salt/);
    });
});
