import { ZodError } from "zod";

export class ParseInteropAddress extends Error {
    constructor(public readonly zodError: ZodError) {
        super(zodError.message || "Error parsing interop address");
    }
}
