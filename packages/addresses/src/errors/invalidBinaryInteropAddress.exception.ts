export class InvalidBinaryInteropAddress extends Error {
    constructor(message?: string) {
        super(message || "Invalid binary interop address");
    }
}
