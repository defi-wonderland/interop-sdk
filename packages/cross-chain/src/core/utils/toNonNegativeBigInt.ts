/**
 * Coerce a wire value to a non-negative bigint, or `undefined` if malformed.
 * The negative check is what keeps `maxAmount`/`maxValue` caps safe — without
 * it a tampered envelope could smuggle a negative entry under the cap.
 */
export function toNonNegativeBigInt(value: unknown): bigint | undefined {
    let parsed: bigint;
    if (typeof value === "bigint") {
        parsed = value;
    } else if (typeof value === "number") {
        if (!Number.isSafeInteger(value)) return undefined;
        parsed = BigInt(value);
    } else if (typeof value === "string" && value.length > 0) {
        try {
            parsed = BigInt(value);
        } catch {
            return undefined;
        }
    } else {
        return undefined;
    }
    return parsed >= 0n ? parsed : undefined;
}
