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
 * expired (with a small `skewSeconds` tolerance). Throws
 * {@link Eip712EnvelopeMismatch} for missing, malformed, or expired values.
 */
export function assertNotExpired(args: AssertNotExpiredArgs): void {
    const parsed = toUnixSeconds(args.timestamp);
    if (parsed === undefined) {
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
    if (args.timestamp === 0 || args.timestamp === 0n || args.timestamp === "0") return;
    const parsed = toUnixSeconds(args.timestamp);
    if (parsed === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "deadline",
            provider: args.provider,
            primaryType: args.primaryType,
            received: String(args.timestamp),
            cause: "validAfter malformed",
        });
    }
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

const DECIMAL_UNIX_SECONDS = /^\d+$/;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function toUnixSeconds(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value > 0 ? value : undefined;
    }
    if (typeof value === "bigint") {
        if (value <= 0n || value > MAX_SAFE_BIGINT) return undefined;
        return Number(value);
    }
    if (typeof value !== "string" || value.length === 0) return undefined;
    if (!DECIMAL_UNIX_SECONDS.test(value)) return undefined;

    let parsed: bigint;
    try {
        parsed = BigInt(value);
    } catch {
        return undefined;
    }
    if (parsed <= 0n || parsed > MAX_SAFE_BIGINT) return undefined;
    return Number(parsed);
}
