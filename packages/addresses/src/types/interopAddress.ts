import type { Checksum } from "./checksum.js";
import { ChainTypeName } from "../constants/interopAddress.js";

/**
 * Binary variant of InteroperableAddress.
 */
export type InteroperableAddressBinary = {
    version: number;
    chainType: Uint8Array;
    chainReference?: Uint8Array;
    address?: Uint8Array;
};

/**
 * Text variant of InteroperableAddress.
 */
export type InteroperableAddressText = {
    version: number;
    chainType: "eip155" | "bip122" | "solana" | "starknet";
    chainReference?: string;
    address?: string;
};

/**
 * Discriminated union type for interoperable addresses.
 *
 * TypeScript narrows based on the `chainType` field type:
 * - Binary variant: `chainType: Uint8Array`
 * - Text variant: `chainType: "eip155" | "bip122" | "solana" | "starknet"`
 *
 * Use type guards to narrow:
 * - `typeof addr.chainType === "string"` → text variant
 * - `addr.chainType instanceof Uint8Array` → binary variant
 */
export type InteroperableAddress = InteroperableAddressBinary | InteroperableAddressText;

/**
 * Type guard to check if an address is the text variant.
 */
export function isTextAddress(addr: InteroperableAddress): addr is InteroperableAddressText {
    return typeof addr.chainType === "string";
}

/**
 * Type guard to check if an address is the binary variant.
 */
export function isBinaryAddress(addr: InteroperableAddress): addr is InteroperableAddressBinary {
    return addr.chainType instanceof Uint8Array;
}

/**
 * Helper type for chain type - conditional based on InteroperableAddress variant.
 */
export type ChainType<T extends InteroperableAddress = InteroperableAddress> = T extends {
    chainType: infer CT;
}
    ? CT
    : never;

/**
 * Helper type for chain reference - conditional based on InteroperableAddress variant.
 */
export type ChainReference<T extends InteroperableAddress = InteroperableAddress> = T extends {
    chainReference?: infer CR;
}
    ? CR
    : never;

/**
 * Helper type for address - conditional based on InteroperableAddress variant.
 */
export type Address<T extends InteroperableAddress = InteroperableAddress> = T extends {
    address?: infer A;
}
    ? A
    : never;

/**
 * Canonical ERC-7828-style interoperable name representation.
 *
 * Example: `0xabc123...@eip155:1#4CA88C9C`
 */
export type InteroperableName = `${string}@${string}:${string}#${Checksum}`;

/**
 * CAIP-350 chain identifier text representation.
 *
 * Format: `<namespace>:<chainReference>` (e.g. `"eip155:1"`, `"solana:101"`).
 *
 * @see https://standards.chainagnostic.org/CAIPs/caip-350#chain-identifier-text-representation
 */
export type ChainIdentifier = `${ChainTypeName}:${number}`;

/**
 * Parsed components of a CAIP-350 chain identifier.
 *
 * @see https://standards.chainagnostic.org/CAIPs/caip-350#chain-identifier-text-representation
 */
export interface ChainIdentifierParts {
    /** Numeric chain reference (e.g. 1, 42161) */
    chainReference: number;
    /** Chain type namespace (e.g. "eip155", "solana") */
    chainType: ChainTypeName;
}
