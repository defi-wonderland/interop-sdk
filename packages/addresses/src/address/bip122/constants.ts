import { bytesToUnprefixedHex } from "../../utils/bytes.js";

// CAIP-350 binary address type prefixes
// https://namespaces.chainagnostic.org/bip122/caip350
// Covers P2PKH (starts with "1") and P2SH (starts with "3"), both use base58check encoding.
export const BIP122_ADDRESS_TYPE = {
    BASE58CHECK: 0x01,
    WITNESS: 0x02,
} as const;

// Bech32 human-readable part per network
// https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#segwit-address-format
const GENESIS_HASH_TO_HRP: Record<string, string> = {
    "000000000019d6689c085ae165831e93": "bc",
    "000000000933ea01ad0ee984209779ba": "tb",
};

/**
 * Derive the bech32 HRP ("bc" or "tb") from a chain reference (genesis hash prefix).
 */
export function hrpFromChainReference(chainReference: Uint8Array): string {
    const hex = bytesToUnprefixedHex(chainReference);
    const hrp = GENESIS_HASH_TO_HRP[hex];
    if (!hrp) {
        throw new Error(`Unknown Bitcoin network for chain reference: ${hex}`);
    }
    return hrp;
}
