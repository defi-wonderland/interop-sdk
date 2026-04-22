import type {
    ApprovalStep,
    Order,
    SignatureStep,
    Step,
    TransactionStep,
} from "../schemas/order.js";

/** Get all signature steps from an order. */
export function getSignatureSteps(order: Order): SignatureStep[] {
    return order.steps.filter((s): s is SignatureStep => s.kind === "signature");
}

/** Get all user-submittable on-chain steps from an order (regular transactions and approvals). */
export function getTransactionSteps(order: Order): (TransactionStep | ApprovalStep)[] {
    return order.steps.filter(
        (s): s is TransactionStep | ApprovalStep =>
            s.kind === "transaction" || s.kind === "approval",
    );
}

/** Check whether a step is an approval step prepended by the ApprovalService. */
export function isApprovalStep(step: Step): step is ApprovalStep {
    return step.kind === "approval";
}

/** Get all approval steps from an order. */
export function getApprovalSteps(order: Order): ApprovalStep[] {
    return order.steps.filter((s): s is ApprovalStep => s.kind === "approval");
}

/** Check if an order requires only signatures (no user-submitted transactions). */
export function isSignatureOnlyOrder(order: Order): boolean {
    return order.steps.length > 0 && order.steps.every((s) => s.kind === "signature");
}

/** Check if an order requires only user-submitted transactions (transactions or approvals, no signatures). */
export function isTransactionOnlyOrder(order: Order): boolean {
    return (
        order.steps.length > 0 &&
        order.steps.every((s) => s.kind === "transaction" || s.kind === "approval")
    );
}
