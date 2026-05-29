import { getAddress } from "viem";
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

const approvalStep = (chainId: number, to: string): Step => ({
    kind: "transaction",
    category: "approval",
    chainId,
    transaction: { to, data: "0x" },
});

const txStep = (chainId: number, to: string): Step => ({
    kind: "transaction",
    chainId,
    transaction: { to, data: "0x" },
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

    it("accepts a quote whose spender is in the allowlist", () => {
        const quote = makeQuote({
            steps: [approvalStep(1, TOKEN)],
            checks: { allowances: [allowance(1, TRUSTED)] },
        });
        expect(validator.findViolation(quote)).toBeNull();
    });

    it("rejects an untrusted spender", () => {
        const quote = makeQuote({
            steps: [approvalStep(1, TOKEN)],
            checks: { allowances: [allowance(1, UNTRUSTED)] },
        });
        expect(validator.findViolation(quote)?.field).toBe("spender");
    });

    it("rejects an untrusted transaction target", () => {
        const quote = makeQuote({ steps: [txStep(1, UNTRUSTED)] });
        expect(validator.findViolation(quote)?.field).toBe("transactionTo");
    });

    it("ignores the `to` of approval steps", () => {
        const quote = makeQuote({ steps: [approvalStep(1, UNTRUSTED)] });
        expect(validator.findViolation(quote)).toBeNull();
    });

    it("matches addresses regardless of checksum casing", () => {
        const cased = new AllowlistSpenderValidator({ 1: [LETTERED] });
        const quote = makeQuote({
            steps: [approvalStep(1, TOKEN)],
            checks: { allowances: [allowance(1, getAddress(LETTERED))] },
        });
        expect(cased.findViolation(quote)).toBeNull();
    });

    it("rejects a quote on a chain absent from the allowlist", () => {
        const quote = makeQuote({ steps: [txStep(10, TRUSTED)] });
        expect(validator.findViolation(quote)).not.toBeNull();
    });

    it("treats a malformed solver address as untrusted", () => {
        const quote = makeQuote({
            steps: [approvalStep(1, TOKEN)],
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

    it("builds a validator that enforces the allowlist", () => {
        const validator = createSpenderValidator({ trustedSpenders: { 1: [TRUSTED] } });
        const quote = makeQuote({
            steps: [approvalStep(1, TOKEN)],
            checks: { allowances: [allowance(1, UNTRUSTED)] },
        });
        expect(validator.findViolation(quote)).not.toBeNull();
    });
});
