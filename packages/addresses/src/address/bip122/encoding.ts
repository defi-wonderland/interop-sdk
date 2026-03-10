/**
 * Bitcoin address encoding utilities.
 *
 * Bitcoin has three address formats relevant for interop:
 *
 * 1. P2SH (Pay-to-Script-Hash): starts with "3" on mainnet, "2" on testnet.
 *    Encoded with Base58Check (base58 + double-SHA256 checksum).
 *    Payload: 1 version byte + 20-byte script hash.
 *    @see https://en.bitcoin.it/wiki/Pay_to_script_hash
 *
 * 2. SegWit v0 (P2WPKH/P2WSH): starts with "bc1q" on mainnet, "tb1q" on testnet.
 *    Encoded with bech32 (BIP-173). Witness version 0 + 20-byte or 32-byte program.
 *    @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
 *
 * 3. Taproot (SegWit v1): starts with "bc1p" on mainnet, "tb1p" on testnet.
 *    Encoded with bech32m (BIP-350). Witness version 1 + 32-byte program.
 *    @see https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki
 */

import { bech32, bech32m } from "bech32";
import bs58 from "bs58";
import { sha256 } from "viem";

import { bytesEqual } from "../../utils/bytes.js";

// ──────────────────────────────────────────
// Base58Check (P2SH)
// ──────────────────────────────────────────

// Base58Check uses the first 4 bytes of the double-SHA256 hash as checksum.
// https://en.bitcoin.it/wiki/Base58Check_encoding#Creating_a_Base58Check_string
const CHECKSUM_LENGTH = 4;

/**
 * Encode a payload using Base58Check encoding.
 * The payload is typically a version byte followed by the hash (e.g. 0x05 + 20-byte script hash for P2SH).
 *
 * Encoding: base58(payload + sha256(sha256(payload))[0..4])
 *
 * @see https://en.bitcoin.it/wiki/Base58Check_encoding
 */
export function base58checkEncode(payload: Uint8Array): string {
    const checksum = doubleSha256(payload).slice(0, CHECKSUM_LENGTH);
    const data = new Uint8Array(payload.length + CHECKSUM_LENGTH);
    data.set(payload);
    data.set(checksum, payload.length);
    return bs58.encode(data);
}

/**
 * Decode a Base58Check-encoded string and verify its checksum.
 * Returns the payload (version byte + hash) without the 4-byte checksum suffix.
 *
 * @see https://en.bitcoin.it/wiki/Base58Check_encoding#Encoding_a_Bitcoin_address
 */
export function base58checkDecode(address: string): Uint8Array {
    const data = bs58.decode(address);
    if (data.length < CHECKSUM_LENGTH + 1) {
        throw new Error(`Invalid base58check: too short (${data.length} bytes)`);
    }
    const payload = data.slice(0, -CHECKSUM_LENGTH);
    const checksum = data.slice(-CHECKSUM_LENGTH);
    const expected = doubleSha256(payload).slice(0, CHECKSUM_LENGTH);
    if (!bytesEqual(checksum, expected)) {
        throw new Error("Invalid base58check: checksum mismatch");
    }
    return payload;
}

// ──────────────────────────────────────────
// Bech32 / Bech32m (SegWit v0 / Taproot)
// ──────────────────────────────────────────

export type BechEncoding = "bech32" | "bech32m";

/**
 * Decoded witness address components.
 * @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#segwit-address-format
 */
export interface WitnessAddress {
    /** Human-readable part: "bc" for mainnet, "tb" for testnet */
    hrp: string;
    /** Witness version: 0 for SegWit (P2WPKH/P2WSH), 1 for Taproot */
    version: number;
    /** Witness program: 20 bytes for P2WPKH, 32 bytes for P2WSH/Taproot */
    program: Uint8Array;
}

/**
 * Decode a bech32/bech32m address into its witness version and program.
 * The caller specifies the encoding based on the known address type.
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki#decoding
 */
export function bech32Decode(address: string, encoding: BechEncoding): WitnessAddress {
    const decoder = encoding === "bech32" ? bech32 : bech32m;
    const decoded = decoder.decode(address);
    const [version, ...dataWords] = decoded.words;
    if (version === undefined) {
        throw new Error("Invalid bech32 address: missing witness version");
    }
    const program = new Uint8Array(bech32.fromWords(dataWords));
    return { hrp: decoded.prefix, version, program };
}

/**
 * Encode a witness program into a bech32/bech32m address.
 * Uses bech32 for version 0, bech32m for version 1+ per BIP-350.
 *
 * @param hrp - Human-readable part: "bc" for mainnet, "tb" for testnet
 * @see https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki#encoding
 */
export function bech32Encode(hrp: string, version: number, program: Uint8Array): string {
    const words = [version, ...bech32.toWords(program)];
    const encoder = version === 0 ? bech32 : bech32m;
    return encoder.encode(hrp, words);
}

// ──────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────

function doubleSha256(data: Uint8Array): Uint8Array {
    return sha256(sha256(data, "bytes"), "bytes");
}
