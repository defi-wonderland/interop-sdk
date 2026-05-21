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
 * Strings are matched against strict regexes so notation that `Number()` would
 * happily coerce (`"1e10"`, `"1.5"`, `" 1 "`, `"0x1ZZZ"`) is rejected, and the
 * actual conversion goes through `BigInt` so we never silently lose precision.
 * Only non-negative safe integers are returned.
 */
const DECIMAL_CHAIN_ID = /^\d+$/;
const HEX_CHAIN_ID = /^0x[0-9a-fA-F]+$/;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export function parseChainId(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
    }
    if (typeof value === "bigint") {
        return value >= 0n && value <= MAX_SAFE_BIGINT ? Number(value) : undefined;
    }
    if (typeof value !== "string" || value.length === 0) return undefined;
    if (!DECIMAL_CHAIN_ID.test(value) && !HEX_CHAIN_ID.test(value)) return undefined;
    let parsed: bigint;
    try {
        parsed = BigInt(value);
    } catch {
        return undefined;
    }
    return parsed <= MAX_SAFE_BIGINT ? Number(parsed) : undefined;
}
