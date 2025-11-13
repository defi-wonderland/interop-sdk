import { fromBytes, toBytes } from "viem";

import type { InteropAddress } from "../internal.js";
import { validateInteropAddress } from "../internal.js";

/**
 * Converts an InteropAddress object to a binary string.
 *
 * @param interopAddress - The InteropAddress object to convert.
 * @returns The binary string representation of the InteropAddress.
 *
 * @example
 *
 * Input:
 * {
 *     version: 1,
 *     chainType: "0x0000" as Uint8Array,
 *     chainReference: "0x01" as Uint8Array,
 *     address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" as Uint8Array,
 * }
 *
 * Result:
 * 0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045
 *   ^^^^-------------------------------------------------- Version:              decimal 1
 *       ^^^^---------------------------------------------- ChainType:            2 bytes of CAIP namespace
 *           ^^-------------------------------------------- ChainReferenceLength: decimal 1 (non present on interop address object)
 *             ^^------------------------------------------ ChainReference:       1 byte to store uint8(1)
 *               ^^---------------------------------------- AddressLength:        decimal 20 (non present on interop address object)
 *                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Address:              20 bytes of ethereum address
 */
export const toBinary = (interopAddress: InteropAddress): string => {
    const validatedInteropAddress = validateInteropAddress(interopAddress);

    const version = toBytes(validatedInteropAddress.version, { size: 2 });
    const chainType = validatedInteropAddress.chainType;
    const chainReference = validatedInteropAddress.chainReference;
    const chainReferenceLength = toBytes(chainReference.length, { size: 1 });
    const address = validatedInteropAddress.address;
    const addressLength = toBytes(address.length, { size: 1 });

    return fromBytes(
        new Uint8Array([
            ...version,
            ...chainType,
            ...chainReferenceLength,
            ...chainReference,
            ...addressLength,
            ...address,
        ]),
        "hex",
    );
};
