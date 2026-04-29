import type { Hex } from "viem";
import { hexToBigInt, slice } from "viem";

/**
 * Byte layout observed across multiple live LiFi `oif-user-open-v0`
 * intents (selector `0x7515fd56`):
 *
 *   [0..3]      function selector
 *   [4..35]     ABI offset header (`0x20`)
 *   [36..67]    user address
 *   [68..99]    nonce
 *   [100..131]  origin chainId
 *   [132..163]  intent expiry  (unix-second timestamp)   ← what we extract
 *   [164..195]  validAfter / openedAt (unix-second timestamp)
 *   ...
 *
 * The format is not part of the OIF spec — the spec leaves
 * `openIntentTx.data` opaque to the SDK. We extract the field by offset
 * with a strict plausibility check, and fall back to `undefined` on any
 * unexpected shape so callers can degrade gracefully.
 */
const EXPIRY_BYTE_OFFSET = 132;
const EXPIRY_BYTE_END = 164;

/** Minimum plausible unix-second timestamp (year 2001). */
const MIN_PLAUSIBLE_TIMESTAMP = 1_000_000_000;
/** Maximum plausible unix-second timestamp (year 2191). */
const MAX_PLAUSIBLE_TIMESTAMP = 7_000_000_000;

/**
 * Best-effort extraction of the intent expiry from a LiFi
 * `oif-user-open-v0` open-intent calldata.
 *
 * @returns the expiry unix-second timestamp, or `undefined` when the
 *   calldata does not match the expected layout.
 */
export function extractLifiIntentExpiry(calldata: Hex | Uint8Array): number | undefined {
    try {
        const hex = typeof calldata === "string" ? calldata : bytesToHex(calldata);
        const word = slice(hex, EXPIRY_BYTE_OFFSET, EXPIRY_BYTE_END);
        const value = Number(hexToBigInt(word));
        if (value < MIN_PLAUSIBLE_TIMESTAMP || value > MAX_PLAUSIBLE_TIMESTAMP) {
            return undefined;
        }
        return value;
    } catch {
        return undefined;
    }
}

function bytesToHex(bytes: Uint8Array): Hex {
    let hex = "0x";
    for (const byte of bytes) {
        hex += byte.toString(16).padStart(2, "0");
    }
    return hex as Hex;
}
