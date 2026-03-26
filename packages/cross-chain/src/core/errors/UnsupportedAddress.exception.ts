export class UnsupportedAddress extends Error {
    constructor(address: string) {
        super(`Unsupported address: ${address}`);
    }
}
