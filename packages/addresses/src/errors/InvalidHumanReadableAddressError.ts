export class InvalidHumanReadableAddressError extends Error {
    constructor(address: string) {
        super(`Invalid human readable address: ${address}`);
    }
}
