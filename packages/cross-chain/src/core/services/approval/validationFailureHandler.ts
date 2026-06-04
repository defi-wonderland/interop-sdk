import type { ApprovalValidationFailureHandler } from "../../interfaces/approval.interface.js";

/** Default handler: logs dropped allowance checks through `console.warn`. */
export const defaultApprovalValidationFailureHandler: ApprovalValidationFailureHandler = {
    handle({ check, reason }) {
        console.warn(
            `[ApprovalValidation] Dropped untrusted allowance check (${reason}): ` +
                `chain=${check.chainId} token=${check.tokenAddress} ` +
                `owner=${check.owner} spender=${check.spender}`,
        );
    },
};
