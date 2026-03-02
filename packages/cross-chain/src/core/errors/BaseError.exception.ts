export class BaseError extends Error {
    constructor(message: string, cause?: string, stack?: string) {
        super(message);
        this.cause = cause;
        this.stack = stack;
    }

    public override toString(): string {
        return `${this.message}${this.cause ? `: ${this.cause}` : ""}`;
    }
}
