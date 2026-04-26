import type { Order, SignatureStep, Step, TransactionStep } from "../schemas/order.js";

/** Get all signature steps from an order. */
export function getSignatureSteps(order: Order): SignatureStep[] {
    return order.steps.filter((s): s is SignatureStep => s.kind === "signature");
}

/** Get all transaction steps from an order (includes approval steps). */
export function getTransactionSteps(order: Order): TransactionStep[] {
    return order.steps.filter((s): s is TransactionStep => s.kind === "transaction");
}

/** Check whether a step is a token approval transaction. */
export function isApprovalStep(step: Step): boolean {
    return step.kind === "transaction" && step.category === "approval";
}

/** Get all approval steps from an order. */
export function getApprovalSteps(order: Order): TransactionStep[] {
    return order.steps.filter(
        (s): s is TransactionStep => s.kind === "transaction" && s.category === "approval",
    );
}

/** Check if an order requires only signatures (no user-submitted transactions). */
export function isSignatureOnlyOrder(order: Order): boolean {
    return order.steps.length > 0 && order.steps.every((s) => s.kind === "signature");
}

/** Check if an order requires only user-submitted transactions (no signatures). */
export function isTransactionOnlyOrder(order: Order): boolean {
    return order.steps.length > 0 && order.steps.every((s) => s.kind === "transaction");
}
