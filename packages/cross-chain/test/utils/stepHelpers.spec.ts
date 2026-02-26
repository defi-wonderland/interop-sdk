import { describe, expect, it } from "vitest";

import type { Order, SignatureStep, TransactionStep } from "../../src/types/order.js";
import {
    getSignatureSteps,
    getTransactionSteps,
    isSignatureOnlyOrder,
    isTransactionOnlyOrder,
} from "../../src/utils/stepHelpers.js";

const mockTxStep: TransactionStep = {
    kind: "transaction",
    chainId: 1,
    transaction: {
        to: "0x1234567890123456789012345678901234567890",
        data: "0xabcdef",
    },
};

const mockSigStep: SignatureStep = {
    kind: "signature",
    chainId: 1,
    signaturePayload: {
        signatureType: "eip712",
        domain: { name: "Test", chainId: 1 },
        primaryType: "TestMessage",
        types: { TestMessage: [{ name: "value", type: "uint256" }] },
        message: { value: "100" },
    },
};

describe("stepHelpers", () => {
    describe("getSignatureSteps", () => {
        it("returns only signature steps", () => {
            const order: Order = { steps: [mockTxStep, mockSigStep, mockTxStep] };
            const result = getSignatureSteps(order);

            expect(result).toHaveLength(1);
            expect(result[0]!.kind).toBe("signature");
        });

        it("returns empty array when no signature steps", () => {
            const order: Order = { steps: [mockTxStep] };
            expect(getSignatureSteps(order)).toHaveLength(0);
        });

        it("returns all signature steps when multiple exist", () => {
            const order: Order = { steps: [mockSigStep, mockSigStep] };
            expect(getSignatureSteps(order)).toHaveLength(2);
        });
    });

    describe("getTransactionSteps", () => {
        it("returns only transaction steps", () => {
            const order: Order = { steps: [mockSigStep, mockTxStep, mockSigStep] };
            const result = getTransactionSteps(order);

            expect(result).toHaveLength(1);
            expect(result[0]!.kind).toBe("transaction");
        });

        it("returns empty array when no transaction steps", () => {
            const order: Order = { steps: [mockSigStep] };
            expect(getTransactionSteps(order)).toHaveLength(0);
        });
    });

    describe("isSignatureOnlyOrder", () => {
        it("returns true when all steps are signatures", () => {
            const order: Order = { steps: [mockSigStep, mockSigStep] };
            expect(isSignatureOnlyOrder(order)).toBe(true);
        });

        it("returns false when mixed steps", () => {
            const order: Order = { steps: [mockSigStep, mockTxStep] };
            expect(isSignatureOnlyOrder(order)).toBe(false);
        });

        it("returns false for empty steps", () => {
            const order: Order = { steps: [] };
            expect(isSignatureOnlyOrder(order)).toBe(false);
        });
    });

    describe("isTransactionOnlyOrder", () => {
        it("returns true when all steps are transactions", () => {
            const order: Order = { steps: [mockTxStep, mockTxStep] };
            expect(isTransactionOnlyOrder(order)).toBe(true);
        });

        it("returns false when mixed steps", () => {
            const order: Order = { steps: [mockTxStep, mockSigStep] };
            expect(isTransactionOnlyOrder(order)).toBe(false);
        });

        it("returns false for empty steps", () => {
            const order: Order = { steps: [] };
            expect(isTransactionOnlyOrder(order)).toBe(false);
        });
    });
});
