import { describe, expect, it } from "vitest";

import type { Eip712Envelope } from "../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS, PERMIT2_PRIMARY_TYPES } from "../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import {
    validateEnvelopeDomain,
    validatePrimaryType,
} from "../../../src/core/validators/eip712EnvelopeValidator.js";

const PROVIDER = "test";

function makeEnvelope(overrides?: Partial<Eip712Envelope>): Eip712Envelope {
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

    it("accepts an allow-listed primaryType", () => {
        expect(() => validatePrimaryType(makeEnvelope(), allowed, PROVIDER)).not.toThrow();
    });

    it("rejects a primaryType outside the allow-list", () => {
        const envelope = makeEnvelope({ primaryType: "Foo" });
        expect(() => validatePrimaryType(envelope, allowed, PROVIDER)).toThrow(
            Eip712EnvelopeMismatch,
        );
    });

    it("rejects case mismatches (EIP-712 type names are case-sensitive)", () => {
        const envelope = makeEnvelope({ primaryType: "permitTransferFrom" });
        expect(() => validatePrimaryType(envelope, allowed, PROVIDER)).toThrow(
            Eip712EnvelopeMismatch,
        );
    });
});

describe("validateEnvelopeDomain", () => {
    const expected = {
        chainId: 1,
        verifyingContracts: [PERMIT2_ADDRESS],
        primaryTypes: PERMIT2_PRIMARY_TYPES,
        provider: PROVIDER,
    };

    it("accepts a matching envelope", () => {
        expect(() => validateEnvelopeDomain(makeEnvelope(), expected)).not.toThrow();
    });

    it("accepts a string chainId that parses to the expected number", () => {
        const envelope = makeEnvelope({
            domain: { chainId: "1", verifyingContract: PERMIT2_ADDRESS },
        });
        expect(() => validateEnvelopeDomain(envelope, expected)).not.toThrow();
    });

    it("accepts hex chainId", () => {
        const envelope = makeEnvelope({
            domain: { chainId: "0x1", verifyingContract: PERMIT2_ADDRESS },
        });
        expect(() => validateEnvelopeDomain(envelope, expected)).not.toThrow();
    });

    it("accepts bigint chainId", () => {
        const envelope = makeEnvelope({
            domain: { chainId: 1n, verifyingContract: PERMIT2_ADDRESS },
        });
        expect(() => validateEnvelopeDomain(envelope, expected)).not.toThrow();
    });

    it("rejects mismatched chainId", () => {
        const envelope = makeEnvelope({
            domain: { chainId: 137, verifyingContract: PERMIT2_ADDRESS },
        });
        expect(() => validateEnvelopeDomain(envelope, expected)).toThrowError(/chainId/);
    });

    it("rejects malformed chainId", () => {
        const envelope = makeEnvelope({
            domain: { chainId: "abc", verifyingContract: PERMIT2_ADDRESS },
        });
        expect(() => validateEnvelopeDomain(envelope, expected)).toThrowError(/chainId/);
    });

    it("rejects missing chainId", () => {
        const envelope = makeEnvelope({
            domain: { verifyingContract: PERMIT2_ADDRESS },
        });
        expect(() => validateEnvelopeDomain(envelope, expected)).toThrowError(/chainId/);
    });

    it("rejects a non-canonical verifyingContract", () => {
        const envelope = makeEnvelope({
            domain: { chainId: 1, verifyingContract: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" },
        });
        expect(() => validateEnvelopeDomain(envelope, expected)).toThrowError(/verifyingContract/);
    });

    it("accepts checksummed and lowercase verifyingContract equally", () => {
        const lowercase = makeEnvelope({
            domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS.toLowerCase() },
        });
        expect(() => validateEnvelopeDomain(lowercase, expected)).not.toThrow();
    });

    it("rejects when verifyingContracts allow-list is empty", () => {
        expect(() =>
            validateEnvelopeDomain(makeEnvelope(), { ...expected, verifyingContracts: [] }),
        ).toThrowError(/verifyingContracts allow-list is empty/);
    });

    it("rejects Permit2 envelopes that carry a domain.version", () => {
        const envelope = makeEnvelope({
            domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS, version: "1" },
        });
        expect(() => validateEnvelopeDomain(envelope, expected)).toThrowError(/domainVersion/);
    });
});
