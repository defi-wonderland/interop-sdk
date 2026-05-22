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

function toUnixSeconds(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value > 0 ? value : undefined;
    }
    if (typeof value === "bigint") {
        if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
        return Number(value);
    }
    if (typeof value !== "string" || value.length === 0) return undefined;

    let parsed: bigint;
    try {
        parsed = BigInt(value);
    } catch {
        return undefined;
    }
    if (parsed <= 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
    return Number(parsed);
}
