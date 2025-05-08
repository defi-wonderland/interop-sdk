export class ENSNotFound extends Error {
    constructor(address: string) {
        super(`ENS name not found: ${address}`);
    }
}
