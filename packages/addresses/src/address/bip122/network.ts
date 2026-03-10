import { bytesToUnprefixedHex } from "../../utils/bytes.js";

// Bech32 human-readable part per network
// https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#segwit-address-format
const GENESIS_HASH_TO_HRP: Record<string, string> = {
    "000000000019d6689c085ae165831e93": "bc",
    "000000000933ea01ad0ee984209779ba": "tb",
};

// bip122 chain references are 16-byte genesis hash prefixes, hex-encoded (32 chars).
const BIP122_CHAIN_REF_LENGTH = 32;

/**
 * Check if a string is a valid bip122 chain reference (32-char lowercase hex).
 */
export function isValidBip122ChainReference(chainReference: string): boolean {
    return chainReference.length === BIP122_CHAIN_REF_LENGTH && /^[0-9a-f]+$/.test(chainReference);
}

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
