import { Hex } from "viem";

import { HumanReadableAddress } from "../types/humanReadableAddress.js";
import { parseBinary } from "./parseBinary.js";
import { parseHumanReadable } from "./parseHumanReadable.js";

/**
 * Checks if a human readable address is a valid interop address
 * @param humanReadableAddress - The human readable address to check
 * @returns Promise<boolean> true if the address is a valid interop address, false otherwise
 */
export const isHumanReadableInteropAddress = async (
    humanReadableAddress: HumanReadableAddress,
): Promise<boolean> => {
    try {
        await parseHumanReadable(humanReadableAddress);
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
 * @returns Promise<boolean> true if the address is a valid interop address, false otherwise
 */
export const isInteropAddress = async (address: string): Promise<boolean> => {
    return (
        (await isHumanReadableInteropAddress(address as HumanReadableAddress)) ||
        isBinaryInteropAddress(address as Hex)
    );
};
