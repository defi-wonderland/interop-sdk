import { HumanReadableAddress } from "../types/humanReadableAddress.js";
import { parseHumanReadable } from "./parseHumanReadable.js";

/**
 * Checks if a human readable address is a valid interop address
 * @param humanReadableAddress - The human readable address to check
 * @returns Promise<boolean> true if the address is a valid interop address, false otherwise
 */
export const isInteropAddress = async (
    humanReadableAddress: HumanReadableAddress,
): Promise<boolean> => {
    try {
        await parseHumanReadable(humanReadableAddress);
        return true;
    } catch (error) {
        return false;
    }
};
