export class InvalidChecksum extends Error {
    constructor(calculatedChecksum: string, providedChecksum: string) {
        super(`Invalid checksum. Expected ${calculatedChecksum}, got ${providedChecksum}`);
    }
}
