import { DEFAULT_DEADLINE_SKEW_SECONDS } from "../constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";

interface AssertNotExpiredArgs {
    timestamp: unknown;
    provider: string;
    primaryType: string;
    skewSeconds?: number;
}

/**
 * Assert that a Permit2 `deadline` or EIP-3009 `validBefore` timestamp has not
 * expired (with a small `skewSeconds` tolerance).
 */
export function assertNotExpired(args: AssertNotExpiredArgs): void {
    const parsed = toUnixSeconds(args.timestamp);
    if (parsed === undefined || parsed <= 0) {
        throw new Eip712EnvelopeMismatch({
            field: "deadline",
            provider: args.provider,
            primaryType: args.primaryType,
            received: String(args.timestamp),
        });
    }

    const skew = args.skewSeconds ?? DEFAULT_DEADLINE_SKEW_SECONDS;
    const now = Math.floor(Date.now() / 1000);
    if (parsed < now - skew) {
        throw new Eip712EnvelopeMismatch({
            field: "deadline",
            provider: args.provider,
            primaryType: args.primaryType,
            expected: `>=${now - skew}`,
            received: parsed,
        });
    }
}

/**
 * Assert that an EIP-3009 `validAfter` timestamp is not post-dated beyond
 * `skewSeconds`. `validAfter: 0` means "immediately valid" and is legitimate.
 */
export function assertNotPostDated(args: AssertNotExpiredArgs): void {
    const parsed = toUnixSeconds(args.timestamp);
    if (parsed === undefined || parsed < 0) {
        throw new Eip712EnvelopeMismatch({
            field: "deadline",
            provider: args.provider,
            primaryType: args.primaryType,
            received: String(args.timestamp),
            cause: "validAfter malformed",
        });
    }
    if (parsed === 0) return;
    const skew = args.skewSeconds ?? DEFAULT_DEADLINE_SKEW_SECONDS;
    const now = Math.floor(Date.now() / 1000);
    if (parsed > now + skew) {
        throw new Eip712EnvelopeMismatch({
            field: "deadline",
            provider: args.provider,
            primaryType: args.primaryType,
            expected: `<=${now + skew}`,
            received: parsed,
            cause: "validAfter is in the future",
        });
    }
}

function toUnixSeconds(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) ? value : undefined;
    }
    let parsed: bigint;
    if (typeof value === "bigint") {
        parsed = value;
    } else if (typeof value === "string" && value.length > 0) {
        try {
            parsed = BigInt(value);
        } catch {
            return undefined;
        }
    } else {
        return undefined;
    }
    const asNumber = Number(parsed);
    return Number.isSafeInteger(asNumber) ? asNumber : undefined;
}
