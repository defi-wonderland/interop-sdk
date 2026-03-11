import { fromHex, Hex, toHex } from "viem";

import { InvalidAddress } from "../../internal.js";

const STARKNET_ADDRESS_BYTES = 32;

// 0x prefix + 1 to 64 hex chars (felt252, up to 32 bytes)
const STARKNET_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{1,64}$/;

/**
 * Convert a starknet binary address (32 bytes) to its 0x-prefixed hex text representation.
 */
export function starknetAddressToText(address: Uint8Array): string {
    if (address.length !== STARKNET_ADDRESS_BYTES) {
        throw new InvalidAddress(
            `starknet address must be ${STARKNET_ADDRESS_BYTES} bytes, got ${address.length}`,
        );
    }
    return toHex(address, { size: STARKNET_ADDRESS_BYTES });
}

/**
 * Convert a 0x-prefixed hex starknet address to its 32-byte binary representation.
 */
export function starknetAddressToBinary(address: string): Uint8Array {
    if (!STARKNET_ADDRESS_PATTERN.test(address)) {
        throw new InvalidAddress(`Invalid starknet address: ${address}`);
    }
    return fromHex(address as Hex, { size: STARKNET_ADDRESS_BYTES, to: "bytes" });
}
