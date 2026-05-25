import { describe, expect, it } from "vitest";

import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";

describe("Eip712EnvelopeMismatch", () => {
    it("extends ProviderGetQuoteFailure and exposes the typed metadata as readonly fields", () => {
        const error = new Eip712EnvelopeMismatch({
            field: "chainId",
            provider: "across",
            primaryType: "PermitTransferFrom",
            expected: 1,
            received: 137n,
            cause: "wrong network",
        });

        expect(error).toBeInstanceOf(ProviderGetQuoteFailure);
        expect(error.field).toBe("chainId");
        expect(error.provider).toBe("across");
        expect(error.primaryType).toBe("PermitTransferFrom");
        expect(error.expected).toBe(1);
        expect(error.received).toBe(137n);
    });

    it("formats the message with every supplied scalar (string, number, bigint)", () => {
        const error = new Eip712EnvelopeMismatch({
            field: "amount",
            provider: "relay",
            primaryType: "TransferWithAuthorization",
            expected: 1_000_000n,
            received: 2_000_000n,
        });

        expect(error.message).toContain('EIP-712 envelope mismatch from "relay" on field "amount"');
        expect(error.message).toContain("primaryType=TransferWithAuthorization");
        expect(error.message).toContain("expected=1000000");
        expect(error.message).toContain("received=2000000");
    });

    it("appends the cause to the message when supplied", () => {
        const error = new Eip712EnvelopeMismatch({
            field: "verifyingContract",
            provider: "oif",
            cause: "InvalidAddressError: checksum failed",
        });

        expect(error.message).toContain("InvalidAddressError: checksum failed");
    });

    it("omits optional fields from the message when undefined", () => {
        const error = new Eip712EnvelopeMismatch({
            field: "structure",
            provider: "permit2",
        });

        expect(error.message).toBe('EIP-712 envelope mismatch from "permit2" on field "structure"');
        expect(error.primaryType).toBeUndefined();
        expect(error.expected).toBeUndefined();
        expect(error.received).toBeUndefined();
    });
});
