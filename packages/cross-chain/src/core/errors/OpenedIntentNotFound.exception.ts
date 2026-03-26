import type { Hex } from "viem";

/**
 * Error thrown when an opened intent event is not found in a transaction
 */
export class OpenedIntentNotFoundError extends Error {
    constructor(txHash: Hex, protocol: string) {
        super(`${protocol} opened intent event not found in transaction ${txHash}`);
        this.name = "OpenedIntentNotFoundError";
    }
}

/**
 * Error thrown when an OIF standard Open event is not found in a transaction
 */
export class OIFOpenEventNotFoundError extends Error {
    constructor(txHash: Hex) {
        super(`OIF Open event not found in transaction ${txHash}`);
        this.name = "OIFOpenEventNotFoundError";
    }
}

/**
 * Error thrown when an Open event has invalid data
 */
export class InvalidOpenEventError extends Error {
    constructor(message: string) {
        super(`Invalid Open event: ${message}`);
        this.name = "InvalidOpenEventError";
    }
}
