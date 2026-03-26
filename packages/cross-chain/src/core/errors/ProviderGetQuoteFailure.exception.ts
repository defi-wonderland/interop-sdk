import { BaseError } from "./BaseError.exception.js";

export class ProviderGetQuoteFailure extends BaseError {
    constructor(message: string, cause?: string, stack?: string) {
        super(message, cause, stack);
    }
}
