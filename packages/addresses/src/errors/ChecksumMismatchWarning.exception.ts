import { Checksum } from "../internal.js";

export class ChecksumMismatchWarning extends Error {
    constructor(expected: Checksum, received: Checksum) {
        super(
            `Checksum mismatch: expected ${expected}, got ${received}. ` +
                `Note: ENS addresses may resolve to different values over time. ` +
                `Verify the resolved address is correct before proceeding.`,
        );
        this.name = "ChecksumMismatchWarning";
    }
}
