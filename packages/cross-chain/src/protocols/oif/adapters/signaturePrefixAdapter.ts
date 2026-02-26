/**
 * Signature Prefix Adapter (#34)
 * @see https://github.com/openintentsframework/oif-specs/issues/34
 *
 * TEMPORARY - OIF expects prefix byte: 0x00 for Permit2, 0x01 for EIP-3009
 */

import type { Hex } from "viem";

export function prefixSignatureForOrderType(signature: Hex, orderType: string): Hex {
    if (orderType === "oif-escrow-v0") return `0x00${signature.slice(2)}` as Hex;
    if (orderType === "oif-3009-v0") return `0x01${signature.slice(2)}` as Hex;
    return signature;
}
