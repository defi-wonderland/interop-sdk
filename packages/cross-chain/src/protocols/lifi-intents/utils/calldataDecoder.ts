import { bytesToHex, hexToBigInt, isHex, slice } from "viem";

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
 * Accepts the calldata as either a hex string, raw bytes, or `undefined`
 * (so callers can pass `entry.order?.openIntentTx?.data` directly without
 * a guard). Returns `undefined` for any input that is not a valid hex
 * string of the expected shape.
 */
export function extractLifiIntentExpiry(
    calldata: string | Uint8Array | undefined,
): number | undefined {
    if (calldata === undefined) return undefined;

    try {
        const hex = typeof calldata === "string" ? calldata : bytesToHex(calldata);
        if (!isHex(hex)) return undefined;

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
