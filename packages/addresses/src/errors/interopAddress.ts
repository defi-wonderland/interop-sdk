import { ZodError } from "zod";

export class ParseInteropAddressError extends Error {
    constructor(public readonly zodError: ZodError) {
        super(zodError.message || "Error parsing interop address");
    }
}

export class InvalidBinaryInteropAddressError extends Error {
    constructor(message?: string) {
        super(message || "Invalid binary interop address");
    }
}
