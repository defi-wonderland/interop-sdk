import bs58 from "bs58";
import { Chain, createPublicClient, hexToBytes, http } from "viem";
import * as chains from "viem/chains";
import { normalize } from "viem/ens";

import {
    calculateChecksum,
    CHAIN_TYPE,
    Checksum,
    InteropAddress,
    InvalidChainIdentifierError,
    InvalidChecksumError,
    InvalidConversionTypeError,
    InvalidDecimalError,
    InvalidHumanReadableAddressError,
    MissingChainNamespaceError,
    MissingHumanReadableAddressError,
    validateInteropAddress,
} from "../internal.js";

/**
 * Validates the checksum of an InteropAddress against its calculated checksum
 * @throws {Error} If the checksum is invalid
 */
const validateChecksum = (interopAddress: InteropAddress, checksum: Checksum): void => {
    const calculatedChecksum = calculateChecksum(interopAddress);
    if (calculatedChecksum !== checksum) {
        throw new InvalidChecksumError(calculatedChecksum, checksum);
    }
};

/**
 * Converts various input formats to Uint8Array
 * @throws {Error} If the input format is invalid or conversion fails
 */
const convertToBytes = (
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
        throw new Error(
            `Failed to convert ${type} input: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
};

/**
 * Parses an address string, handling both regular addresses and ENS names
 * @throws {Error} If the address is invalid or ENS lookup fails
 */
const parseAddress = async (address: string): Promise<Uint8Array> => {
    if (!address) {
        throw new Error("Address cannot be empty");
    }

    if (address.includes(".eth")) {
        try {
            const client = createPublicClient({
                chain: chains.mainnet,
                transport: http(),
            });
            const ensAddress = await client.getEnsAddress({ name: normalize(address) });
            if (!ensAddress) {
                throw new Error(`ENS name not found: ${address}`);
            }
            return convertToBytes(ensAddress, "hex");
        } catch (error) {
            throw new Error(
                `Failed to resolve ENS name: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
    return convertToBytes(address, "hex");
};

/**
 * Validates a chain identifier
 * @returns true if the chain is valid, false otherwise
 */
const validateChain = (chainReference: string): boolean => {
    if (!chainReference) return false;
    const chainId = Number(chainReference);

    if (isNaN(chainId)) {
        return false;
    }

    const chainValues = Object.values(chains) as unknown as Chain[];
    return chainValues.some((chain) => chain.id === chainId);
};

/**
 * Parses a human-readable address into an InteropAddress
 * @throws {Error} If the address format is invalid or validation fails
 */
export const parseHumanReadable = async (humanReadableAddress: string): Promise<InteropAddress> => {
    if (!humanReadableAddress) {
        throw new MissingHumanReadableAddressError();
    }

    const INTEROP_HUMAN_REGEX =
        /^([.\-:_%a-zA-Z0-9]*)@([-a-z0-9]{3,8}):?([\-_a-zA-Z0-9]{1,32})?#([A-F0-9]{8})$/;
    const interopHumanMatch = humanReadableAddress.match(INTEROP_HUMAN_REGEX);

    if (!interopHumanMatch) {
        throw new InvalidHumanReadableAddressError(humanReadableAddress);
    }

    const [, address, chainNamespace, chainReference, checksum] = interopHumanMatch;

    if (!chainNamespace) {
        throw new MissingChainNamespaceError();
    }

    if (chainReference && !validateChain(chainReference)) {
        throw new InvalidChainIdentifierError(chainReference);
    }

    const addressBytes = address ? await parseAddress(address) : new Uint8Array();
    const chainReferenceBytes = convertToBytes(chainReference, "decimal");
    const chainTypeBytes = chainNamespace
        ? convertToBytes(CHAIN_TYPE[chainNamespace], "hex")
        : new Uint8Array();

    const interopAddress: InteropAddress = {
        version: 1,
        address: addressBytes,
        chainType: chainTypeBytes,
        chainReference: chainReferenceBytes,
    };

    validateInteropAddress(interopAddress);
    validateChecksum(interopAddress, checksum as Checksum);

    return interopAddress;
};
