/**
 * Error thrown when an InteroperableName string is invalid.
 * Formats the error message appropriately based on whether it's already formatted or just an address.
 */
export class InvalidInteroperableName extends Error {
    constructor(messageOrAddress: string) {
        // If the message is already formatted (contains "Invalid" or "ENS names require"), use it as-is
        // Otherwise, format it as "Invalid human readable address: {address}"
        if (
            messageOrAddress.includes("Invalid") ||
            messageOrAddress.includes("ENS names require")
        ) {
            super(messageOrAddress);
        } else {
            super(`Invalid human readable address: ${messageOrAddress}`);
        }
    }
}
