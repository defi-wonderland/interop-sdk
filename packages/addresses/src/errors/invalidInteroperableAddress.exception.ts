import { ZodError } from "zod";

/**
 * Extracts a user-friendly error message from a Zod error.
 * The schema now provides user-friendly messages directly, so we can use them as-is.
 */
function extractZodErrorMessage(zodError: ZodError): string {
    const issues = zodError.issues;

    // Return the first error message (schema now provides user-friendly messages)
    if (issues.length > 0 && issues[0]) {
        return issues[0].message;
    }

    return "Invalid interoperable address";
}

export class InvalidInteroperableAddress extends Error {
    constructor(public readonly zodError: ZodError) {
        super(extractZodErrorMessage(zodError));
    }
}
