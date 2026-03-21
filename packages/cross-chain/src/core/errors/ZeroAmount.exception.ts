/** Thrown when a build-quote input or output amount is zero. */
export class ZeroAmount extends Error {
    constructor(field: "input" | "output") {
        super(`${field}.amount must be greater than zero`);
    }
}
