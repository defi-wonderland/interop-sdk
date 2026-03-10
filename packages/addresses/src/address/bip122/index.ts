import type { BechEncoding } from "./encoding.js";
import { InvalidAddress } from "../../internal.js";
import {
    base58checkDecode,
    base58checkEncode,
    bech32Decode,
    bech32Encode,
    BIP122_ADDRESS_TYPE,
} from "./encoding.js";
import { hrpFromChainReference } from "./network.js";

/**
 * Convert a bip122 binary address to its native text representation.
 */
export function bip122AddressToText(address: Uint8Array, chainReference?: Uint8Array): string {
    if (address.length < 2) {
        throw new InvalidAddress(`bip122 address too short (${address.length} bytes)`);
    }

    const typeByte = address[0] as number;
    const witnessVersion = address[1] as number;

    switch (typeByte) {
        case BIP122_ADDRESS_TYPE.BASE58CHECK:
            return base58checkEncode(address.slice(1));

        case BIP122_ADDRESS_TYPE.WITNESS: {
            if (!chainReference) {
                throw new InvalidAddress("bip122 witness address requires chain reference for HRP");
            }
            const hrp = hrpFromChainReference(chainReference);
            return bech32Encode(hrp, witnessVersion, address.slice(2));
        }

        default:
            throw new InvalidAddress(
                `Unknown bip122 address type: 0x${typeByte.toString(16).padStart(2, "0")}`,
            );
    }
}

/**
 * Convert a native Bitcoin address string to its bip122 binary representation.
 */
export function bip122AddressToBinary(address: string): Uint8Array {
    const encoding = detectWitnessEncoding(address);

    if (encoding) {
        const { version, program } = bech32Decode(address, encoding);
        return Uint8Array.of(BIP122_ADDRESS_TYPE.WITNESS, version, ...program);
    }

    const payload = base58checkDecode(address);
    return Uint8Array.of(BIP122_ADDRESS_TYPE.BASE58CHECK, ...payload);
}

/**
 * bc1q / tb1q = SegWit v0 (bech32), bc1p / tb1p = Taproot v1 (bech32m).
 * Returns null for non-witness addresses (P2SH, P2PKH).
 */
function detectWitnessEncoding(address: string): BechEncoding | null {
    const lower = address.toLowerCase();
    if (lower.startsWith("bc1q") || lower.startsWith("tb1q")) return "bech32";
    if (lower.startsWith("bc1") || lower.startsWith("tb1")) return "bech32m";
    return null;
}
