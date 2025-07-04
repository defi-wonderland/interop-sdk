import { Hex } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";

import { SUPPORTED_CHAINS } from "../../internal.js";

export const UNIVERSAL_ROUTER_ADDRESS: Record<(typeof SUPPORTED_CHAINS)[number]["id"], Hex> = {
    [sepolia.id]: "0x3a9d48ab9751398bbfa63ad67599bb04e4bdf98b",
    [baseSepolia.id]: "0x492e6456d9528771018deb9e87ef7750ef184104",
    [arbitrumSepolia.id]: "0xefd1d4bd4cf1e86da286bb4cb1b8bced9c10ba47",
};

export const UNIVERSAL_ROUTER_ABI = [
    {
        inputs: [
            { internalType: "bytes", name: "commands", type: "bytes" },
            { internalType: "bytes[]", name: "inputs", type: "bytes[]" },
            { internalType: "uint256", name: "deadline", type: "uint256" },
        ],
        name: "execute",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
] as const;

export const UNISWAP_V4_TX_DEADLINE = 3600; // 1 hour in seconds
