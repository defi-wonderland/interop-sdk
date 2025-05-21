export class UnsupportedProtocol extends Error {
    constructor(protocolName: string) {
        super(`Unsupported protocol: ${protocolName}`);
    }
}
