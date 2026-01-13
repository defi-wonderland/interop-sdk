import { Hex } from "viem";

import type { InteroperableName } from "../types/interopAddress.js";
import { decodeAddress } from "../address/index.js";
import { validateChecksum } from "../internal.js";
import { parseName } from "../name/index.js";

export type ParseInteroperableNameOptions = {
    validateChecksumFlag?: boolean;
};

/**
 * Checks if an interoperable name is a valid interop address
 * @param interoperableName - The interoperable name to check
 * @param options - The options for validation
 *        - validateChecksumFlag: Whether to validate the checksum of the address
 * @returns Promise<boolean> true if the address is a valid interop address, false otherwise
 */
export const isInteroperableName = async (
    interoperableName: InteroperableName,
    options: ParseInteroperableNameOptions = {},
): Promise<boolean> => {
    try {
        const { interoperableAddress, meta } = await parseName(interoperableName);

        if (options.validateChecksumFlag && meta.checksum) {
            // checksum is already validated through schema in parseInteroperableName
            validateChecksum(interoperableAddress, meta.checksum, {
                isENSName: meta.isENS,
            });
        }

        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Checks if a binary address is a valid interop address
 * @param binaryAddress - The binary address to check
 * @returns boolean true if the address is a valid interop address, false otherwise
 */
export const isBinaryInteropAddress = (binaryAddress: Hex): boolean => {
    try {
        decodeAddress(binaryAddress);
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Checks if a given address is a valid interop address
 * @param address - The address to check
 * @param options - The options for validation
 *        - validateChecksumFlag: Whether to validate the checksum of the address
 * @returns Promise<boolean> true if the address is a valid interop address, false otherwise
 */
export const isInteropAddress = async (
    address: string,
    options: ParseInteroperableNameOptions = {},
): Promise<boolean> => {
    return (
        (await isInteroperableName(address as InteroperableName, options)) ||
        isBinaryInteropAddress(address as Hex)
    );
};
