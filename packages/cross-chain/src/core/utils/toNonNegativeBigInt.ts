import { hexToBigInt, isHex } from "viem";

const DECIMAL_UINT = /^\d+$/;

/**
 * Coerce an unknown wire value to a non-negative bigint, or `undefined` if
 * malformed. Strings must be strict decimal or `0x`-hex literals — bare
 * `BigInt()` would otherwise accept surrounding whitespace, binary/octal
 * prefixes, and uppercase `0X`, widening the wire format beyond what EIP-712
 * messages legitimately carry. Rejecting negatives keeps `maxAmount` /
 * `maxValue` caps safe against tampered envelopes smuggling negative entries.
 */
export function toNonNegativeBigInt(value: unknown): bigint | undefined {
    if (typeof value === "bigint") return value >= 0n ? value : undefined;
    if (typeof value === "number") {
        if (!Number.isSafeInteger(value) || value < 0) return undefined;
        return BigInt(value);
    }
    if (typeof value !== "string" || value.length === 0) return undefined;
    if (isHex(value)) {
        return value.length > 2 ? hexToBigInt(value) : undefined;
    }
    if (!DECIMAL_UINT.test(value)) return undefined;
    try {
        return BigInt(value);
    } catch {
        return undefined;
    }
}
