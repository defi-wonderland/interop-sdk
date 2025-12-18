import {
    CHAIN_TYPE,
    ChainTypeName,
    Checksum,
    convertAddress,
    HumanReadableAddressSchema,
    InteropAddress,
    InvalidChainNamespace,
    validateChecksum,
    validateInteropAddress,
} from "../internal.js";
import { convertToBytes } from "./convertToBytes.js";

/**
 * Parses a chain reference into a Uint8Array
 * @throws {Error} If the chain reference is invalid
 */
const parseChainReference = (chainNamespace: ChainTypeName, chainReference: string): Uint8Array => {
    switch (chainNamespace) {
        case "eip155":
            return convertToBytes(chainReference, "decimal");
        case "solana":
            return convertToBytes(chainReference, "base58");
        default:
            throw new InvalidChainNamespace(chainNamespace);
    }
};

export type ParseHumanReadableOptions = {
    validateChecksumFlag?: boolean;
};

/**
 * Parses a human-readable address into an InteropAddress
 * @param humanReadableAddress - The human-readable address to parse
 * @param options - Parsing options
 * @param options.validateChecksumFlag - Whether to validate the checksum if provided
 * @throws {Error} If the address format is invalid or validation fails
 */
export const parseHumanReadable = async (
    humanReadableAddress: string,
    options: ParseHumanReadableOptions = {},
): Promise<InteropAddress> => {
    const { validateChecksumFlag = true } = options;
    const parsedHumanReadableAddress =
        await HumanReadableAddressSchema.parseAsync(humanReadableAddress);

    const { address, chainNamespace, chainReference, checksum, isENSName } =
        parsedHumanReadableAddress;

    const addressBytes = await convertAddress(address, {
        chainType: chainNamespace as ChainTypeName,
        chainReference,
    });
    const chainReferenceBytes = chainReference
        ? parseChainReference(chainNamespace as ChainTypeName, chainReference)
        : new Uint8Array();
    const chainTypeBytes = chainNamespace
        ? new Uint8Array(convertToBytes(CHAIN_TYPE[chainNamespace], "hex"))
        : new Uint8Array();

    const interopAddress: InteropAddress = {
        version: 1,
        address: addressBytes,
        chainType: chainTypeBytes,
        chainReference: chainReferenceBytes,
    };

    validateInteropAddress(interopAddress);

    if (validateChecksumFlag && checksum) {
        validateChecksum(interopAddress, checksum as Checksum, {
            isENSName: Boolean(isENSName),
        });
    }

    return interopAddress;
};
