export class InvalidInteroperableName extends Error {
    constructor(address: string) {
        super(`Invalid interoperable name: ${address}`);
    }
}
