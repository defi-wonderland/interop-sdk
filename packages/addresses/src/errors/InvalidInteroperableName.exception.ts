/**
 * Error thrown when an InteroperableName string is invalid.
 * Formats the error message appropriately based on whether it's already formatted or just an address.
 */
export class InvalidInteroperableName extends Error {
    constructor(messageOrAddress: string) {
        // If the message is already formatted (starts with "Invalid"), use it as-is
        // Otherwise, format it as "Invalid interoperable name: {address}"
        if (messageOrAddress.startsWith("Invalid")) {
            super(messageOrAddress);
        } else {
            super(`Invalid interoperable name: ${messageOrAddress}`);
        }
    }
}
