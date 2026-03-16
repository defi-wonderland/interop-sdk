import { fromHex, Hex, pad } from "viem";

import { InvalidAddress } from "../../internal.js";

// 0x prefix + 1 to 64 hex chars (felt252, up to 32 bytes)
const STARKNET_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{1,64}$/;

const STARKNET_ADDRESS_BYTES = 32;
const FELT252_MAX = 2n ** 252n - 1n;

/**
 * Convert a 0x-prefixed hex starknet address to its 32-byte binary representation.
 */
export function starknetAddressToBinary(address: string): Uint8Array {
    if (!STARKNET_ADDRESS_PATTERN.test(address)) {
        throw new InvalidAddress(`Invalid starknet address: ${address}`);
    }
    if (BigInt(address) > FELT252_MAX) {
        throw new InvalidAddress(`starknet address exceeds felt252 range: ${address}`);
    }
    return fromHex(pad(address as Hex, { size: STARKNET_ADDRESS_BYTES }), "bytes");
}
