export class InvalidAddress extends Error {
    constructor(message?: string) {
        super(message || "Invalid address");
    }
}
