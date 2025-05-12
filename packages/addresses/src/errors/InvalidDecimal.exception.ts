export class InvalidDecimal extends Error {
    constructor(input: string) {
        super(`Invalid decimal number: ${input}`);
    }
}
