import type { Order, SignatureStep, TransactionStep } from "../schemas/order.js";

/** Get all signature steps from an order. */
export function getSignatureSteps(order: Order): SignatureStep[] {
    return order.steps.filter((s): s is SignatureStep => s.kind === "signature");
}

/** Get all transaction steps from an order. */
export function getTransactionSteps(order: Order): TransactionStep[] {
    return order.steps.filter((s): s is TransactionStep => s.kind === "transaction");
}

/** Check whether a transaction step is an approval prepended by the ApprovalService. */
export function isApprovalStep(step: TransactionStep): boolean {
    return step.approval === true;
}

/** Get all approval transaction steps from an order. */
export function getApprovalSteps(order: Order): TransactionStep[] {
    return getTransactionSteps(order).filter((s) => s.approval === true);
}

/** Check if an order requires only signatures (no user-submitted transactions). */
export function isSignatureOnlyOrder(order: Order): boolean {
    return order.steps.length > 0 && order.steps.every((s) => s.kind === "signature");
}

/** Check if an order requires only transactions (no signatures). */
export function isTransactionOnlyOrder(order: Order): boolean {
    return order.steps.length > 0 && order.steps.every((s) => s.kind === "transaction");
}
