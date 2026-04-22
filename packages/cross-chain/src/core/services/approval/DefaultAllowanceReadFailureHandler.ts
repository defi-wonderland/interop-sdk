import type {
    AllowanceReadFailure,
    AllowanceReadFailureHandler,
} from "../../interfaces/approval.interface.js";

/**
 * Default `AllowanceReadFailureHandler`. Logs each failure through
 * `console.warn` so misconfiguration (missing RPC for a chain, unknown chain
 * ID, flaky provider) is visible instead of silent.
 */
export class DefaultAllowanceReadFailureHandler implements AllowanceReadFailureHandler {
    handle(failure: AllowanceReadFailure): void {
        console.warn(
            `[ApprovalService] allowance read failed (chainId=${failure.chainId}, reason=${failure.reason}):`,
            failure.error,
        );
    }
}
