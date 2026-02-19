import { encodeAddress } from "@wonderland/interop-addresses";
import { Address, Hex } from "viem";

/**
 * Convert a bytes32 value to an Ethereum address
 *
 * In Ethereum's ABI encoding, addresses are stored as bytes32 values that are right-aligned.
 * This means the actual 20-byte address is in the last 40 hex characters (20 bytes = 40 hex chars).
 *
 * @param bytes32 - The bytes32 hex string (with or without 0x prefix)
 * @returns The extracted Ethereum address
 *
 * @example
 * ```typescript
 * const bytes32Value = "0x000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
 * const address = bytes32ToAddress(bytes32Value);
 * // Returns: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
 * ```
 */
export function bytes32ToAddress(bytes32: Hex): Address {
    // Take the last 40 characters (20 bytes = 40 hex chars)
    return `0x${bytes32.slice(-40)}` as Address;
}

/**
 * Encode a raw address + chain ID into an EIP-7930 interoperable address (hex format).
 */
export function toEVMInteropAddress(chainId: number, address: Address): Address {
    return encodeAddress(
        { version: 1, chainType: "eip155", chainReference: chainId.toString(), address },
        { format: "hex" },
    ) as Address;
}
