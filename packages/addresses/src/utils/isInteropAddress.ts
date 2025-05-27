import { Hex } from "viem";

import { HumanReadableAddress } from "../types/humanReadableAddress.js";
import { parseBinary } from "./parseBinary.js";
import { parseHumanReadable, ParseHumanReadableOptions } from "./parseHumanReadable.js";

/**
 * Checks if a human readable address is a valid interop address
 * @param humanReadableAddress - The human readable address to check
 * @param options - The options to pass to the parseHumanReadable function
 *        - validateChecksumFlag: Whether to validate the checksum of the address
 * @returns Promise<boolean> true if the address is a valid interop address, false otherwise
 */
export const isHumanReadableInteropAddress = async (
    humanReadableAddress: HumanReadableAddress,
    options: ParseHumanReadableOptions = {},
): Promise<boolean> => {
    try {
        await parseHumanReadable(humanReadableAddress, options);
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Checks if a binary address is a valid interop address
 * @param binaryAddress - The binary address to check
 * @returns Promise<boolean> true if the address is a valid interop address, false otherwise
 */
export const isBinaryInteropAddress = (binaryAddress: Hex): boolean => {
    try {
        parseBinary(binaryAddress);
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Checks if a given address is a valid interop address
 * @param address - The address to check
 * @param options - The options to pass to the parseHumanReadable function
 *        - validateChecksumFlag: Whether to validate the checksum of the address
 * @returns Promise<boolean> true if the address is a valid interop address, false otherwise
 */
export const isInteropAddress = async (
    address: string,
    options: ParseHumanReadableOptions = {},
): Promise<boolean> => {
    return (
        (await isHumanReadableInteropAddress(address as HumanReadableAddress, options)) ||
        isBinaryInteropAddress(address as Hex)
    );
};
