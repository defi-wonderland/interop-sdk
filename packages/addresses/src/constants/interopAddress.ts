export enum ChainTypeValue {
    EIP155 = "0x0000",
    SOLANA = "0x0002",
}

export type ChainTypeName = keyof typeof CHAIN_TYPE;

export const CHAIN_TYPE: Record<string, ChainTypeValue> = {
    eip155: ChainTypeValue.EIP155,
    solana: ChainTypeValue.SOLANA,
} as const;

export const CHAIN_TYPE_VALUE_TO_NAME: Record<ChainTypeValue, ChainTypeName> = {
    [ChainTypeValue.EIP155]: "eip155",
    [ChainTypeValue.SOLANA]: "solana",
} as const;
