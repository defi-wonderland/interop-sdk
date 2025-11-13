export class InvalidHumanReadableAddress extends Error {
    constructor(address: string) {
        super(`Invalid human readable address: ${address}`);
    }
}
