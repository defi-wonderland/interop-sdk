import { fromHex, Hex } from "viem";

import type { InteropAddress } from "../internal.js";
import { parseAddress, parseChainReference, parseChainType, parseVersion } from "../internal.js";

/**
 * Parses a binary interop address into an InteropAddress object.
 *
 * @param binaryAddress - The binary interop address to parse.
 * @returns The parsed InteropAddress object.
 *
 * @example
 *
 * Input:
 * 0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045
 *   ^^^^-------------------------------------------------- Version:              decimal 1
 *       ^^^^---------------------------------------------- ChainType:            2 bytes of CAIP namespace
 *           ^^-------------------------------------------- ChainReferenceLength: decimal 1 (non present on interop address object)
 *             ^^------------------------------------------ ChainReference:       1 byte to store uint8(1)
 *               ^^---------------------------------------- AddressLength:        decimal 20 (non present on interop address object)
 *                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Address:              20 bytes of ethereum address
 *
 * Result:
 * {
 *     version: 1,
 *     chainType: "0x0000" as Uint8Array,
 *     chainReference: "0x01" as Uint8Array,
 *     address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" as Uint8Array,
 * }
 */
export const parseBinary = (binaryAddress: Hex): InteropAddress => {
    const byteBinaryAddress = fromHex(binaryAddress, "bytes");

    const version = parseVersion(byteBinaryAddress);
    const chainType = parseChainType(byteBinaryAddress);
    const chainReference = parseChainReference(byteBinaryAddress);
    const address = parseAddress(byteBinaryAddress);

    return {
        version,
        chainType,
        chainReference,
        address,
    };
};
