type ChainType = "eip155" | "solana";

/** Native token placeholder addresses by chain type. */
const NATIVE_ADDRESSES: Record<ChainType, Set<string>> = {
    eip155: new Set([
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "0x0000000000000000000000000000000000000000",
    ]),
    solana: new Set([
        "11111111111111111111111111111111", // System Program
    ]),
};

/** Returns true if the address is a native token placeholder for the given chain type. */
export const isNativeAddress = (address: string, chainType: ChainType): boolean =>
    NATIVE_ADDRESSES[chainType].has(address.toLowerCase());
