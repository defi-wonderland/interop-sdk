import bs58 from "bs58";
import { sha256 } from "viem";

import { bytesEqual } from "./bytes.js";

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

function doubleSha256(data: Uint8Array): Uint8Array {
    return sha256(sha256(data, "bytes"), "bytes");
}
