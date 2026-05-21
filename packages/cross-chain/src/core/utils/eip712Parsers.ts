import { hexToBigInt, isHex } from "viem";

/**
 * Strict parsers for EIP-712 envelope fields. They reject anything that cannot
 * be represented losslessly so that a tampered envelope can never sneak past
 * downstream validators.
 */

/** Parse a unix-seconds value to a positive safe integer, or `undefined` if invalid. */
export function parseUnixSeconds(value: unknown): number | undefined {
    if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        Number.isInteger(value) &&
        value > 0
    ) {
        return value;
    }
    if (typeof value === "bigint" && value > 0n) {
        if (value > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
        return Number(value);
    }
    if (typeof value === "string" && value.length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0) return parsed;
    }
    return undefined;
}

/**
 * Parse a non-negative amount to bigint, or `undefined` if invalid.
 *
 * Negative values are rejected: amounts in Permit2 and EIP-3009 cannot be
 * negative on-chain, and a negative value would silently bypass `maxAmount` /
 * `maxValue` caps that only test `value > limit`.
 */
export function parseBigint(value: unknown): bigint | undefined {
    if (typeof value === "bigint") return value >= 0n ? value : undefined;
    if (typeof value === "number") {
        if (!Number.isSafeInteger(value) || value < 0) return undefined;
        return BigInt(value);
    }
    if (typeof value === "string" && value.length > 0) {
        let parsed: bigint;
        try {
            parsed = BigInt(value);
        } catch {
            return undefined;
        }
        return parsed >= 0n ? parsed : undefined;
    }
    return undefined;
}

/**
 * Parse a chainId encoded as number, bigint, decimal string or 0x-hex string.
 *
 * Hex strings are validated with viem's `isHex` (rejects `"0x1ZZZ"`, `"0x"`)
 * and converted with `hexToBigInt`. Decimal strings must match `^\d+$` so the
 * permissive coercions of `Number()` (`"1e10"`, `"1.5"`, `" 1 "`) are out.
 * Only non-negative safe integers are returned — anything above
 * `Number.MAX_SAFE_INTEGER` would lose precision when converted back to number.
 */
const DECIMAL_CHAIN_ID = /^\d+$/;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export function parseChainId(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
    }
    if (typeof value === "bigint") {
        return value >= 0n && value <= MAX_SAFE_BIGINT ? Number(value) : undefined;
    }
    if (typeof value !== "string" || value.length === 0) return undefined;

    let parsed: bigint;
    if (isHex(value)) {
        try {
            parsed = hexToBigInt(value);
        } catch {
            return undefined;
        }
    } else if (DECIMAL_CHAIN_ID.test(value)) {
        parsed = BigInt(value);
    } else {
        return undefined;
    }

    return parsed <= MAX_SAFE_BIGINT ? Number(parsed) : undefined;
}
