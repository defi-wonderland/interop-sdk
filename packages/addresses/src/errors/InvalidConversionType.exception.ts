export class InvalidConversionType extends Error {
    constructor(type: string) {
        super(`Unsupported conversion type: ${type}`);
    }
}
