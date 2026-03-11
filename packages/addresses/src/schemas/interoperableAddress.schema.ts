import bs58 from "bs58";
import { isAddress, pad, trim } from "viem";
import { z } from "zod";

import { bip122AddressToBinary } from "../address/bip122/index.js";
import { isValidBip122ChainReference } from "../address/bip122/network.js";
import { starknetAddressToBinary } from "../address/starknet/index.js";
import { isValidStarknetChainReference } from "../address/starknet/network.js";
import { CHAIN_TYPE_LABEL } from "../constants/interopAddress.js";

/**
 * Validates that a chain reference is valid for the given chain type.
 */
const isValidChainReferenceForType = (
    chainType: "eip155" | "bip122" | "solana" | "starknet",
    chainReference: string | undefined,
): boolean => {
    if (!chainReference) {
        return true; // Optional field
    }

    switch (chainType) {
        case "eip155": {
            const chainId = Number(chainReference);
            return Number.isInteger(chainId) && chainId > 0;
        }
        case "bip122":
            return isValidBip122ChainReference(chainReference);
        case "solana": {
            try {
                const decoded = bs58.decode(chainReference);
                return decoded.length > 0 && decoded.length <= 32;
            } catch {
                return false;
            }
        }
        case "starknet":
            return isValidStarknetChainReference(chainReference);
        default:
            return false;
    }
};

/**
 * Validates that an address is valid for the given chain type.
 */
const isValidAddressForType = (
    chainType: "eip155" | "bip122" | "solana" | "starknet",
    address: string | undefined,
): boolean => {
    if (!address) {
        return true; // Optional field
    }

    switch (chainType) {
        case "eip155":
            return isAddress(address, { strict: false });
        case "bip122": {
            try {
                bip122AddressToBinary(address);
                return true;
            } catch {
                return false;
            }
        }
        case "solana": {
            try {
                const decoded = bs58.decodeUnsafe(address);
                return decoded !== undefined && decoded.length > 0;
            } catch {
                return false;
            }
        }
        case "starknet": {
            try {
                starknetAddressToBinary(address);
                return true;
            } catch {
                return false;
            }
        }
        default:
            return false;
    }
};

/**
 * Schema for validating text representation of InteroperableAddress.
 * Used by parseInteroperableName to validate text input.
 */
export const interoperableAddressTextSchema = z
    .object({
        version: z.number().positive().int(),
        chainType: z.enum(["eip155", "bip122", "solana", "starknet"]),
        chainReference: z.string().optional(),
        address: z.string().optional(),
    })
    .refine((data) => data.chainReference !== undefined || data.address !== undefined, {
        message: "At least one of chainReference or address must be provided",
    })
    .refine(
        (data) => isValidChainReferenceForType(data.chainType, data.chainReference),
        (data) => ({
            message: `Invalid chain identifier: ${data.chainReference}`,
            path: ["chainReference"],
        }),
    )
    .refine(
        (data) => isValidAddressForType(data.chainType, data.address),
        (data) => ({
            message: `Invalid ${CHAIN_TYPE_LABEL[data.chainType]} address: ${data.address}`,
            path: ["address"],
        }),
    );

/**
 * Schema for validating binary representation of InteroperableAddress.
 */
export const interoperableAddressBinarySchema = z
    .object({
        version: z.number().positive().int(),
        chainType: z
            .custom<Uint8Array>((value) => value instanceof Uint8Array, {
                message: "Chain type must be a Uint8Array",
            })
            .refine((value) => trim(value).length <= 2, {
                message: "Chain type must be representable as 2 bytes",
            })
            .transform((value) => pad(trim(value), { size: 2 })),
        chainReference: z
            .custom<Uint8Array>((value) => value instanceof Uint8Array, {
                message: "Chain reference must be a Uint8Array",
            })
            .refine((value) => trim(value).length <= 32, {
                message: "Chain reference must be representable as 32 bytes",
            })
            .optional(),
        address: z
            .custom<Uint8Array>((value) => value instanceof Uint8Array, {
                message: "Address must be a Uint8Array",
            })
            .refine((value) => trim(value).length <= 255, {
                message: "Address must be representable as 255 bytes",
            })
            .optional(),
    })
    .refine((data) => data.chainReference !== undefined || data.address !== undefined, {
        message: "At least one of chainReference or address must be provided",
    });

/**
 * Schema for validating InteroperableAddress (discriminated union).
 * Validates either binary or text representation based on chainType type.
 */
export const interoperableAddressSchema = z.union([
    interoperableAddressBinarySchema,
    interoperableAddressTextSchema,
]);
