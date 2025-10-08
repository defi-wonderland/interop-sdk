import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";

export const SUPPORTED_CHAINS = [sepolia, baseSepolia, arbitrumSepolia] as const;

export const DEFAULT_PUBLIC_RPC_URLS: Record<number, string> = {
    [sepolia.id]: "https://ethereum-sepolia-rpc.publicnode.com",
    [baseSepolia.id]: "https://base-sepolia-rpc.publicnode.com",
    [arbitrumSepolia.id]: "https://arbitrum-sepolia-rpc.publicnode.com",
};
