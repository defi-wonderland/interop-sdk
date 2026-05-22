/**
 * Coerce an unknown wire value to a non-negative bigint, or `undefined` if
 * malformed. Rejecting negatives is the invariant that keeps `maxAmount` /
 * `maxValue` caps safe: a `value > limit` check would otherwise approve any
 * negative entry that a tampered envelope could smuggle in.
 */
export function toNonNegativeBigInt(value: unknown): bigint | undefined {
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
