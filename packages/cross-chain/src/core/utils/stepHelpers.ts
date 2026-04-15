import type { Order, SignatureStep, TransactionStep } from "../schemas/order.js";

/** ERC-20 `approve(address,uint256)` function selector. */
const ERC20_APPROVE_SELECTOR = "0x095ea7b3";

/** Get all signature steps from an order. */
export function getSignatureSteps(order: Order): SignatureStep[] {
    return order.steps.filter((s): s is SignatureStep => s.kind === "signature");
}

/** Get all transaction steps from an order. */
export function getTransactionSteps(order: Order): TransactionStep[] {
    return order.steps.filter((s): s is TransactionStep => s.kind === "transaction");
}

/** Check whether a transaction step is an ERC-20 `approve` call. */
export function isApprovalStep(step: TransactionStep): boolean {
    return step.transaction.data.toLowerCase().startsWith(ERC20_APPROVE_SELECTOR);
}

/** Get all approval transaction steps from an order. */
export function getApprovalSteps(order: Order): TransactionStep[] {
    return getTransactionSteps(order).filter(isApprovalStep);
}

/** Check if an order requires only signatures (no user-submitted transactions). */
export function isSignatureOnlyOrder(order: Order): boolean {
    return order.steps.length > 0 && order.steps.every((s) => s.kind === "signature");
}

/** Check if an order requires only transactions (no signatures). */
export function isTransactionOnlyOrder(order: Order): boolean {
    return order.steps.length > 0 && order.steps.every((s) => s.kind === "transaction");
}
