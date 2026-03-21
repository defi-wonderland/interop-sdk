/** Thrown when a build-quote fillDeadline is in the past or too close to the current time. */
export class InvalidDeadline extends Error {
    constructor(
        public readonly deadline: number,
        public readonly nowSeconds: number,
        reason: "past" | "too-soon",
        minBuffer?: number,
    ) {
        const detail =
            reason === "past"
                ? `fillDeadline (${deadline}) is in the past (now: ${nowSeconds})`
                : `fillDeadline is too soon: ${deadline - nowSeconds}s from now, minimum is ${minBuffer}s`;
        super(detail);
    }
}
