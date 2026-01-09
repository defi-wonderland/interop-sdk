import { ZodError } from "zod";

/**
 * Error thrown when an InteroperableAddress fails validation.
 * The schema provides user-friendly error messages, so we extract the first one.
 */
export class InvalidInteroperableAddress extends Error {
    constructor(public readonly zodError: ZodError) {
        // Schema now provides user-friendly messages directly
        const firstIssue = zodError.issues[0];
        super(firstIssue?.message ?? "Invalid interoperable address");
    }
}
