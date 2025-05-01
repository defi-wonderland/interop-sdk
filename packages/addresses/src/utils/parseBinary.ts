import { fromBytes, fromHex, Hex } from "viem";

import type { Address, ChainReference, ChainType, InteropAddress } from "../internal.js";
import { InvalidBinaryInteropAddressError } from "../errors/interopAddress.js";

const parseVersion = (binaryAddress: Uint8Array): number => {
    const VERSION_OFFSET = 0;
    const VERSION_LENGTH = 2;

    const version = binaryAddress.slice(VERSION_OFFSET, VERSION_OFFSET + VERSION_LENGTH);

    if (version.length !== VERSION_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid version length");
    }

    return Number.parseInt(fromBytes(version, "hex"), 16);
};

const parseChainType = (binaryAddress: Uint8Array): ChainType => {
    const CHAIN_TYPE_OFFSET = 2;
    const CHAIN_TYPE_LENGTH = 2;

    const chainType = binaryAddress.slice(CHAIN_TYPE_OFFSET, CHAIN_TYPE_OFFSET + CHAIN_TYPE_LENGTH);

    if (chainType.length !== CHAIN_TYPE_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid chain type length");
    }

    return chainType;
};

const parseChainReferenceLength = (binaryAddress: Uint8Array): number => {
    const CHAIN_REFERENCE_LENGTH_OFFSET = 4;
    const CHAIN_REFERENCE_LENGTH_LENGTH = 1;

    const chainReferenceLength = binaryAddress.slice(
        CHAIN_REFERENCE_LENGTH_OFFSET,
        CHAIN_REFERENCE_LENGTH_OFFSET + CHAIN_REFERENCE_LENGTH_LENGTH,
    );

    if (chainReferenceLength.length !== CHAIN_REFERENCE_LENGTH_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid chain reference length");
    }

    return Number.parseInt(fromBytes(chainReferenceLength, "hex"), 16);
};

const parseChainReference = (binaryAddress: Uint8Array): ChainReference => {
    const CHAIN_REFERENCE_OFFSET = 5;
    const CHAIN_REFERENCE_LENGTH = parseChainReferenceLength(binaryAddress);

    const chainReference = binaryAddress.slice(
        CHAIN_REFERENCE_OFFSET,
        CHAIN_REFERENCE_OFFSET + CHAIN_REFERENCE_LENGTH,
    );

    if (chainReference.length !== CHAIN_REFERENCE_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid chain reference length");
    }

    return chainReference;
};

const parseAddressLength = (binaryAddress: Uint8Array): number => {
    const ADDRESS_LENGTH_OFFSET = 5 + parseChainReferenceLength(binaryAddress);
    const ADDRESS_LENGTH_LENGTH = 1;

    const addressLength = binaryAddress.slice(
        ADDRESS_LENGTH_OFFSET,
        ADDRESS_LENGTH_OFFSET + ADDRESS_LENGTH_LENGTH,
    );

    if (addressLength.length !== ADDRESS_LENGTH_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid address length");
    }

    return Number.parseInt(fromBytes(addressLength, "hex"), 16);
};

const parseAddress = (binaryAddress: Uint8Array): Address => {
    const ADDRESS_OFFSET = 6 + parseChainReferenceLength(binaryAddress);
    const ADDRESS_LENGTH = parseAddressLength(binaryAddress);

    const address = binaryAddress.slice(ADDRESS_OFFSET, ADDRESS_OFFSET + ADDRESS_LENGTH);

    if (address.length !== ADDRESS_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid address length");
    }

    return address;
};

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
