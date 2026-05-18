import { BaseError } from "./BaseError.exception.js";

/** Why a Permit2 signature payload was rejected. */
export type Permit2ValidationReason =
    | "verifying-contract"
    | "non-permit2-canonical"
    | "permitted-empty"
    | "permitted-token"
    | "permitted-amount"
    | "spender";

export class Permit2ValidationFailure extends BaseError {
    public readonly reason: Permit2ValidationReason;
    public readonly providerId: string;

    constructor(
        reason: Permit2ValidationReason,
        providerId: string,
        message: string,
        cause?: string,
        stack?: string,
    ) {
        super(message, cause, stack);
        this.reason = reason;
        this.providerId = providerId;
        this.name = "Permit2ValidationFailure";
    }
}
