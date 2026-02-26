import type { Address, Hex } from "viem";
import { decodeAddress, encodeAddress } from "@wonderland/interop-addresses";

import type { InteropAccountId } from "../types/interopAccountId.js";

/**
 * Decode an ERC-7930 binary hex address into an {@link InteropAccountId}.
 *
 * @example
 * ```ts
 * const id = toInteropAccountId("0x00010000010114a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
 * // { chainId: 1, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }
 * ```
 */
export function toInteropAccountId(hex: string): InteropAccountId {
    const decoded = decodeAddress(hex as Hex);
    if (!decoded.address) {
        throw new Error(`Cannot decode address from ERC-7930 hex: ${hex}`);
    }
    if (!decoded.chainReference) {
        throw new Error(`Cannot decode chain reference from ERC-7930 hex: ${hex}`);
    }
    return {
        chainId: Number(decoded.chainReference),
        address: decoded.address,
    };
}

/**
 * Encode an {@link InteropAccountId} into an ERC-7930 binary hex string.
 *
 * @example
 * ```ts
 * const hex = fromInteropAccountId({ chainId: 8453, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" });
 * // "0x0001000002210514833589fcd6edb6e08f4c7c32d4f71b54bda02913"
 * ```
 */
export function fromInteropAccountId(id: InteropAccountId): Address {
    return encodeAddress(
        {
            version: 1,
            chainType: "eip155",
            chainReference: id.chainId.toString(),
            address: id.address,
        },
        { format: "hex" },
    ) as Address;
}
