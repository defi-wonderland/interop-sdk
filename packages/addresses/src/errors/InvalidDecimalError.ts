export class InvalidDecimalError extends Error {
    constructor(input: string) {
        super(`Invalid decimal number: ${input}`);
    }
}
