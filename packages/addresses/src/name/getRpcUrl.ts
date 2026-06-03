/**
 * Resolves the mainnet RPC URL used by ENS-backed lookups.
 *
 * Blank strings are treated as missing so callers can pass through optional
 * configuration values without accidentally disabling the env fallback.
 */
export function getRpcUrl(rpcUrl?: string): string | undefined {
    return rpcUrl?.trim() || process.env.MAINNET_RPC_URL?.trim() || undefined;
}
