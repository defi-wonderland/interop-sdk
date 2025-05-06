export class InvalidConversionTypeError extends Error {
    constructor(type: string) {
        super(`Unsupported conversion type: ${type}`);
    }
}
