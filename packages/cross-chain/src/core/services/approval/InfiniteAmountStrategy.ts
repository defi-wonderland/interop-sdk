import { maxUint256 } from "viem";

import type { ApprovalAmountStrategy } from "../../interfaces/approval.interface.js";

/**
 * Approves `type(uint256).max` so future orders on the same (token, spender)
 * pair do not require another approval transaction.
 *
 * Use with care: this grants the spender an unbounded allowance.
 */
export class InfiniteAmountStrategy implements ApprovalAmountStrategy {
    resolve(_required: bigint): bigint {
        return maxUint256;
    }
}
