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
