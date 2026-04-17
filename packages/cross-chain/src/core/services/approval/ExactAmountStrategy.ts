import type { ApprovalAmountStrategy } from "../../interfaces/approval.interface.js";

/**
 * Approves exactly the amount required by the order.
 *
 * Safest default: minimises the allowance surface, at the cost of an extra
 * approval transaction the next time the same (token, spender) pair is used.
 */
export class ExactAmountStrategy implements ApprovalAmountStrategy {
    resolve(required: bigint): bigint {
        return required;
    }
}
