import { calculateChecksum, Checksum, InteropAddress, InvalidChecksumError } from "../internal.js";

/**
 * Validates the checksum of an InteropAddress against its calculated checksum
 * @throws {Error} If the checksum is invalid
 */
export const validateChecksum = (interopAddress: InteropAddress, checksum: Checksum): void => {
    const calculatedChecksum = calculateChecksum(interopAddress);
    if (calculatedChecksum !== checksum) {
        throw new InvalidChecksumError(calculatedChecksum, checksum);
    }
};
