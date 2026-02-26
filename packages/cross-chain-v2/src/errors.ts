/**
 * Base error for all SDK errors. Extends native Error with optional details + original stack.
 */
export class SdkError extends Error {
    public readonly details?: string;
    public readonly originalStack?: string;

    constructor(message: string, details?: string, originalStack?: string) {
        super(message);
        this.name = this.constructor.name;
        this.details = details;
        this.originalStack = originalStack;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    override toString(): string {
        return `${this.name}: ${this.message}${this.details ? ` — ${this.details}` : ""}`;
    }
}

// ──── Quote errors ────

export class QuoteFetchError extends SdkError {}

export class QuoteValidationError extends SdkError {}

export class QuoteTimeoutError extends SdkError {}

// ──── Submit errors ────

export class SubmitError extends SdkError {}

export class PayloadValidationError extends SdkError {}

export class SettlerValidationError extends SdkError {}

// ──── Tracking errors ────

export class TrackingError extends SdkError {}

export class TrackingRefInvalidError extends SdkError {}

export class TrackingTimeoutError extends SdkError {}

export class OriginTxRevertedError extends SdkError {}

export class OpenEventParseError extends SdkError {}

// ──── Asset discovery errors ────

export class AssetDiscoveryError extends SdkError {}

// ──── Protocol / config errors ────

export class UnsupportedProtocolError extends SdkError {}

export class IntentNotFoundError extends SdkError {}
