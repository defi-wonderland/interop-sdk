export enum ChainTypeValue {
    EIP155 = "0x0000",
    SOLANA = "0x0002",
}

export const CHAIN_TYPE: Record<string, string> = {
    eip155: ChainTypeValue.EIP155,
    solana: ChainTypeValue.SOLANA,
} as const;

export const CHAIN_TYPE_MAP: Record<string, string> = {
    [ChainTypeValue.EIP155]: "eip155",
    [ChainTypeValue.SOLANA]: "solana",
} as const;
