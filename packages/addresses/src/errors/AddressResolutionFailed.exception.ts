export class AddressResolutionFailed extends Error {
    constructor(message: string) {
        super(`Failed to resolve address: ${message}`);
    }
}
