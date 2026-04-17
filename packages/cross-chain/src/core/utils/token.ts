type ChainType = "eip155" | "solana";

/**
 * EIP-7528 canonical native asset placeholder address.
 * Use this when constructing QuoteRequests for native tokens (ETH, MATIC, etc.).
 */
export const NATIVE_ASSET_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;

/** Solana canonical native placeholder — the System Program account. */
const SOLANA_NATIVE_ADDRESS = "11111111111111111111111111111111" as const;

/** Native token placeholder addresses by chain type. */
const NATIVE_ADDRESSES: Record<ChainType, Set<string>> = {
    eip155: new Set([NATIVE_ASSET_ADDRESS, "0x0000000000000000000000000000000000000000"]),
    solana: new Set([SOLANA_NATIVE_ADDRESS]),
};

/** Canonical native placeholder by chain type. */
const CANONICAL_BY_CHAIN_TYPE: Record<ChainType, string> = {
    eip155: NATIVE_ASSET_ADDRESS,
    solana: SOLANA_NATIVE_ADDRESS,
};

/** Returns true if the address is a native token placeholder for the given chain type. */
export const isNativeAddress = (address: string, chainType: ChainType): boolean =>
    NATIVE_ADDRESSES[chainType].has(address.toLowerCase());

/**
 * Normalize an address for cross-provider lookup.
 *
 * Native placeholders collapse to the canonical form for the given chain type
 * ({@link NATIVE_ASSET_ADDRESS} on EVM), so native tokens reported under
 * different sentinels (e.g. `0xEEE…E` vs `0x000…0`) deduplicate in the SDK's
 * discovery, routing, and validation surfaces. Non-native EVM addresses are
 * returned lowercase for case-insensitive comparisons; Solana addresses keep
 * their original casing because base58 is case-sensitive.
 */
export const toCanonicalNativeAddress = (address: string, chainType: ChainType): string => {
    if (isNativeAddress(address, chainType)) return CANONICAL_BY_CHAIN_TYPE[chainType];
    return chainType === "eip155" ? address.toLowerCase() : address;
};
