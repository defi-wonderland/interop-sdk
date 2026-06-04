import type { Address } from "viem";
import { encodeFunctionData, erc20Abi, getAddress, maxUint256 } from "viem";
import { describe, expect, it } from "vitest";

import type { Order, Step } from "../../src/core/schemas/order.js";
import type { Quote } from "../../src/core/schemas/quote.js";
import { createSpenderValidator } from "../../src/external.js";
import { AllowlistSpenderValidator } from "../../src/internal.js";

const USER = "0x4444444444444444444444444444444444444444";
const TOKEN = "0x3333333333333333333333333333333333333333";
const TRUSTED = "0x1111111111111111111111111111111111111111";
const UNTRUSTED = "0x2222222222222222222222222222222222222222";
const LETTERED = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

const approveCalldata = (spender: string): string =>
    encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender as Address, maxUint256],
    });

const approvalStep = (chainId: number, spender: string): Step => ({
    kind: "transaction",
    category: "approval",
    chainId,
    transaction: { to: TOKEN, data: approveCalldata(spender) },
});

const mislabeledApprovalStep = (chainId: number, to: string): Step => ({
    kind: "transaction",
    category: "approval",
    chainId,
    transaction: { to, data: "0xdeadbeef" },
});

const txStep = (chainId: number, to: string): Step => ({
    kind: "transaction",
    chainId,
    transaction: { to, data: "0x" },
});

const approveShapedCall = (chainId: number, to: string, spender: string): Step => ({
    kind: "transaction",
    chainId,
    transaction: { to, data: approveCalldata(spender) },
});

const permit2Step = (chainId: number, spender: string): Step => ({
    kind: "signature",
    chainId,
    signaturePayload: {
        signatureType: "eip712",
        domain: { chainId },
        primaryType: "PermitBatchWitnessTransferFrom",
        types: {},
        message: { spender },
    },
});

const eip3009Step = (chainId: number, to: string): Step => ({
    kind: "signature",
    chainId,
    signaturePayload: {
        signatureType: "eip712",
        domain: { chainId },
        primaryType: "ReceiveWithAuthorization",
        types: {},
        message: { to },
    },
});

const unknownSignatureStep = (chainId: number): Step => ({
    kind: "signature",
    chainId,
    signaturePayload: {
        signatureType: "eip712",
        domain: { chainId },
        primaryType: "BatchCompact",
        types: {},
        message: { arbiter: TRUSTED },
    },
});

const allowance = (
    chainId: number,
    spender: string,
): { chainId: number; tokenAddress: string; owner: string; spender: string; required: string } => ({
    chainId,
    tokenAddress: TOKEN,
    owner: USER,
    spender,
    required: "1",
});

function makeQuote(order: Order): Quote {
    return {
        order,
        preview: {
            inputs: [{ chainId: 1, accountAddress: USER, assetAddress: TOKEN, amount: "1" }],
            outputs: [{ chainId: 10, accountAddress: USER, assetAddress: TOKEN, amount: "1" }],
        },
        provider: "test",
    };
}

describe("AllowlistSpenderValidator", () => {
    const validator = new AllowlistSpenderValidator({ 1: [TRUSTED] });

    it("accepts an approve whose decoded spender is in the allowlist", () => {
        const quote = makeQuote({ steps: [approvalStep(1, TRUSTED)] });
        expect(validator.findViolation(quote)).toBeNull();
    });

    it("rejects an approve whose decoded spender is untrusted", () => {
        const quote = makeQuote({ steps: [approvalStep(1, UNTRUSTED)] });
        expect(validator.findViolation(quote)?.field).toBe("spender");
    });

    it("rejects an untrusted transaction target", () => {
        const quote = makeQuote({ steps: [txStep(1, UNTRUSTED)] });
        expect(validator.findViolation(quote)?.field).toBe("transactionTo");
    });

    it("validates the `to` of a step mislabeled as approval", () => {
        const quote = makeQuote({ steps: [mislabeledApprovalStep(1, UNTRUSTED)] });
        expect(validator.findViolation(quote)?.field).toBe("transactionTo");
    });

    it("validates the `to` of approve-shaped calldata that no approval check corroborates", () => {
        const quote = makeQuote({ steps: [approveShapedCall(1, UNTRUSTED, TRUSTED)] });
        expect(validator.findViolation(quote)?.field).toBe("transactionTo");
    });

    it("accepts an approve corroborated by a matching allowance check without a category tag", () => {
        const quote = makeQuote({
            steps: [approveShapedCall(1, TOKEN, TRUSTED)],
            checks: { allowances: [allowance(1, TRUSTED)] },
        });
        expect(validator.findViolation(quote)).toBeNull();
    });

    it("validates the spender from checks.allowances", () => {
        const quote = makeQuote({
            steps: [approvalStep(1, TRUSTED)],
            checks: { allowances: [allowance(1, UNTRUSTED)] },
        });
        expect(validator.findViolation(quote)?.field).toBe("spender");
    });

    it("rejects an untrusted Permit2 message.spender", () => {
        const quote = makeQuote({ steps: [permit2Step(1, UNTRUSTED)] });
        expect(validator.findViolation(quote)?.field).toBe("spender");
    });

    it("accepts a trusted Permit2 message.spender", () => {
        const quote = makeQuote({ steps: [permit2Step(1, TRUSTED)] });
        expect(validator.findViolation(quote)).toBeNull();
    });

    it("rejects an untrusted EIP-3009 message.to", () => {
        const quote = makeQuote({ steps: [eip3009Step(1, UNTRUSTED)] });
        expect(validator.findViolation(quote)?.field).toBe("signatureRecipient");
    });

    it("accepts a trusted EIP-3009 message.to", () => {
        const quote = makeQuote({ steps: [eip3009Step(1, TRUSTED)] });
        expect(validator.findViolation(quote)).toBeNull();
    });

    it("fails closed on a signature it cannot extract a counterparty from", () => {
        const quote = makeQuote({ steps: [unknownSignatureStep(1)] });
        expect(validator.findViolation(quote)?.field).toBe("signatureRecipient");
    });

    it("matches addresses regardless of checksum casing", () => {
        const cased = new AllowlistSpenderValidator({ 1: [LETTERED] });
        const quote = makeQuote({ steps: [approvalStep(1, getAddress(LETTERED))] });
        expect(cased.findViolation(quote)).toBeNull();
    });

    it("rejects a quote on a chain absent from the allowlist", () => {
        const quote = makeQuote({ steps: [txStep(10, TRUSTED)] });
        expect(validator.findViolation(quote)).not.toBeNull();
    });

    it("treats a malformed solver address as untrusted", () => {
        const quote = makeQuote({
            steps: [approvalStep(1, TRUSTED)],
            checks: { allowances: [allowance(1, "0x123")] },
        });
        expect(validator.findViolation(quote)).not.toBeNull();
    });
});

describe("createSpenderValidator", () => {
    it("rejects an invalid allowlist address", () => {
        expect(() =>
            createSpenderValidator({ trustedSpenders: { 1: ["not-an-address"] } }),
        ).toThrow();
    });

    it("rejects an empty allowlist", () => {
        expect(() => createSpenderValidator({ trustedSpenders: {} })).toThrow();
    });

    it("builds a validator that enforces the allowlist", () => {
        const validator = createSpenderValidator({ trustedSpenders: { 1: [TRUSTED] } });
        const quote = makeQuote({ steps: [approvalStep(1, UNTRUSTED)] });
        expect(validator.findViolation(quote)).not.toBeNull();
    });
});
