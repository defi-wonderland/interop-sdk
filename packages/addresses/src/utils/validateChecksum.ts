import {
    calculateChecksum,
    Checksum,
    ChecksumMismatchWarning,
    InteropAddress,
    InvalidChecksum,
} from "../internal.js";

export interface ValidateChecksumOptions {
    /**
     * Whether the address is an ENS name (or other naming service)
     * If true, uses ChecksumMismatchWarning instead of InvalidChecksum on mismatch
     */
    isENSName?: boolean;
}

/**
 * Validates the checksum of an InteropAddress against its calculated checksum
 * @param interopAddress - The interop address to validate
 * @param checksum - The checksum to validate against
 * @param options - Validation options
 * @throws {InvalidChecksum} If the checksum is invalid for a raw address
 * @throws {ChecksumMismatchWarning} If the checksum is invalid for an ENS name
 */
export const validateChecksum = (
    interopAddress: InteropAddress,
    checksum: Checksum,
    options: ValidateChecksumOptions = {},
): void => {
    const { isENSName = false } = options;
    const calculatedChecksum = calculateChecksum(interopAddress);

    if (calculatedChecksum !== checksum) {
        if (isENSName) {
            throw new ChecksumMismatchWarning(calculatedChecksum, checksum);
        }
        throw new InvalidChecksum(calculatedChecksum, checksum);
    }
};
