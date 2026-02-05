/**
 * Error thrown when asset discovery fails
 */
export class AssetDiscoveryFailure extends Error {
    public readonly details?: string;
    public readonly originalStack?: string;

    constructor(message: string, details?: string, originalStack?: string) {
        super(message);
        this.name = "AssetDiscoveryFailure";
        this.details = details;
        this.originalStack = originalStack;

        // Maintains proper stack trace for where the error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AssetDiscoveryFailure);
        }
    }
}
