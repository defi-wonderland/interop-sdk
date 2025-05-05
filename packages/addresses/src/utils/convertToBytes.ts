import bs58 from "bs58";
import { hexToBytes } from "viem";

import { InvalidConversionTypeError, InvalidDecimalError } from "../internal.js";

/**
 * Converts various input formats to Uint8Array
 * @throws {Error} If the input format is invalid or conversion fails
 */
export const convertToBytes = (
    input: string | undefined,
    type: "hex" | "base58" | "base64" | "decimal",
): Uint8Array => {
    if (!input) {
        return new Uint8Array();
    }

    try {
        switch (type) {
            case "hex":
                const hexInput = input.startsWith("0x") ? input : `0x${input}`;
                return hexToBytes(hexInput as `0x${string}`);
            case "base58":
                return bs58.decode(input);
            case "base64":
                return new Uint8Array(
                    atob(input)
                        .split("")
                        .map((c) => c.charCodeAt(0)),
                );
            case "decimal":
                const decimalNumber = Number(input);
                if (isNaN(decimalNumber)) {
                    throw new InvalidDecimalError(input);
                }
                return convertToBytes(decimalNumber.toString(16), "hex");
            default:
                throw new InvalidConversionTypeError(type);
        }
    } catch (error) {
        if (error instanceof InvalidDecimalError || error instanceof InvalidConversionTypeError) {
            throw error;
        }
        throw new Error(
            `Failed to convert ${type} input: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
};
