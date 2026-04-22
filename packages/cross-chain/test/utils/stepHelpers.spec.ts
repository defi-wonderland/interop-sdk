import { describe, expect, it } from "vitest";

import type {
    ApprovalStep,
    Order,
    SignatureStep,
    TransactionStep,
} from "../../src/core/schemas/order.js";
import {
    getApprovalSteps,
    getSignatureSteps,
    getTransactionSteps,
    isApprovalStep,
    isSignatureOnlyOrder,
    isTransactionOnlyOrder,
} from "../../src/core/utils/stepHelpers.js";

const mockTxStep: TransactionStep = {
    kind: "transaction",
    chainId: 1,
    transaction: {
        to: "0x1234567890123456789012345678901234567890",
        data: "0xabcdef",
    },
};

const mockApprovalStep: ApprovalStep = {
    kind: "approval",
    chainId: 1,
    transaction: {
        to: "0x2222222222222222222222222222222222222222",
        data: "0x095ea7b3",
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
        it("returns all on-chain steps including approval steps", () => {
            const order: Order = { steps: [mockApprovalStep, mockTxStep, mockSigStep] };
            const result = getTransactionSteps(order);

            expect(result).toHaveLength(2);
            expect(result.every((s) => s.kind === "transaction" || s.kind === "approval")).toBe(
                true,
            );
        });

        it("returns empty array when no on-chain steps", () => {
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

    describe("isApprovalStep", () => {
        it("returns true for a step with kind approval", () => {
            expect(isApprovalStep(mockApprovalStep)).toBe(true);
        });

        it("returns false for a regular transaction step", () => {
            expect(isApprovalStep(mockTxStep)).toBe(false);
        });

        it("returns false for a signature step", () => {
            expect(isApprovalStep(mockSigStep)).toBe(false);
        });
    });

    describe("getApprovalSteps", () => {
        it("returns only the approval steps from a mixed order", () => {
            const order: Order = {
                steps: [mockApprovalStep, mockTxStep, mockSigStep],
            };
            const result = getApprovalSteps(order);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(mockApprovalStep);
        });

        it("returns an empty array when no approval steps are present", () => {
            const order: Order = { steps: [mockTxStep, mockSigStep] };
            expect(getApprovalSteps(order)).toHaveLength(0);
        });

        it("returns every approval when multiple approvals are prepended", () => {
            const order: Order = {
                steps: [mockApprovalStep, mockApprovalStep, mockTxStep],
            };
            expect(getApprovalSteps(order)).toHaveLength(2);
        });
    });

    describe("isTransactionOnlyOrder", () => {
        it("returns true when all steps are transactions", () => {
            const order: Order = { steps: [mockTxStep, mockTxStep] };
            expect(isTransactionOnlyOrder(order)).toBe(true);
        });

        it("returns true when steps mix transactions and approvals", () => {
            const order: Order = { steps: [mockApprovalStep, mockTxStep] };
            expect(isTransactionOnlyOrder(order)).toBe(true);
        });

        it("returns true when all steps are approvals", () => {
            const order: Order = { steps: [mockApprovalStep, mockApprovalStep] };
            expect(isTransactionOnlyOrder(order)).toBe(true);
        });

        it("returns false when mixed with signature steps", () => {
            const order: Order = { steps: [mockTxStep, mockSigStep] };
            expect(isTransactionOnlyOrder(order)).toBe(false);
        });

        it("returns false for empty steps", () => {
            const order: Order = { steps: [] };
            expect(isTransactionOnlyOrder(order)).toBe(false);
        });
    });
});
