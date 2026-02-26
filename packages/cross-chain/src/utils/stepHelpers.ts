import type { Order, SignatureStep, TransactionStep } from "../types/order.js";

/** Get all signature steps from an order. */
export function getSignatureSteps(order: Order): SignatureStep[] {
    return order.steps.filter((s): s is SignatureStep => s.kind === "signature");
}

/** Get all transaction steps from an order. */
export function getTransactionSteps(order: Order): TransactionStep[] {
    return order.steps.filter((s): s is TransactionStep => s.kind === "transaction");
}

/** Check if an order requires only signatures (no user-submitted transactions). */
export function isSignatureOnlyOrder(order: Order): boolean {
    return order.steps.length > 0 && order.steps.every((s) => s.kind === "signature");
}

/** Check if an order requires only transactions (no signatures). */
export function isTransactionOnlyOrder(order: Order): boolean {
    return order.steps.length > 0 && order.steps.every((s) => s.kind === "transaction");
}
