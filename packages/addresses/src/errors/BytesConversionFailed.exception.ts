export class BytesConversionFailed extends Error {
    constructor(message: string) {
        super(`Failed to convert to bytes: ${message}`);
    }
}
