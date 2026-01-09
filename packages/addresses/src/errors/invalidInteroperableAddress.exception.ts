import { ZodError } from "zod";

export class InvalidInteroperableAddress extends Error {
    constructor(public readonly zodError: ZodError) {
        super(zodError.message || "Invalid interoperable address");
    }
}
