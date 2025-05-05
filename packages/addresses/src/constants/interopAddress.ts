export enum ChainTypeValue {
    EIP155 = "0x0000",
    SOLANA = "0x0002",
}

export enum ChainTypeName {
    EIP155 = "eip155",
    SOLANA = "solana",
}

export const CHAIN_TYPE: Record<string, ChainTypeValue> = {
    [ChainTypeName.EIP155]: ChainTypeValue.EIP155,
    [ChainTypeName.SOLANA]: ChainTypeValue.SOLANA,
} as const;

export const CHAIN_TYPE_VALUE_TO_NAME: Record<ChainTypeValue, ChainTypeName> = {
    [ChainTypeValue.EIP155]: ChainTypeName.EIP155,
    [ChainTypeValue.SOLANA]: ChainTypeName.SOLANA,
} as const;

// Start position of each field in the binary interop address representation
export const BINARY_OFFSETS = {
    VERSION: 0,
    CHAIN_TYPE: 2,
    CHAIN_REFERENCE_LENGTH: 4,
    CHAIN_REFERENCE: 5,
} as const;

// Byte length of each field in the binary interop address representation
export const BINARY_LENGTHS = {
    VERSION: 2,
    CHAIN_TYPE: 2,
    CHAIN_REFERENCE_LENGTH: 1,
    ADDRESS_LENGTH: 1,
} as const;
