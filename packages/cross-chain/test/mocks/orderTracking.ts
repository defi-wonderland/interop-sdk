import { Address, Hex, Log } from "viem";
import { arbitrumSepolia, sepolia } from "viem/chains";

import { FillEvent, OpenedIntent } from "../../src/internal.js";

export const createMockOpenedIntent = (overrides?: Partial<OpenedIntent>): OpenedIntent => {
    return {
        orderId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex,
        txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex,
        blockNumber: 1000000n,
        originContract: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
        user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
        fillDeadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        originChainId: sepolia.id,
        openDeadline: Math.floor(Date.now() / 1000),
        maxSpent: [],
        minReceived: [],
        fillInstructions: [
            {
                destinationChainId: arbitrumSepolia.id,
                destinationSettler: "0x0000000000000000000000000000000000000000" as Hex,
                originData: "0x" as Hex,
            },
        ],
        ...overrides,
    };
};

export const createMockFillEvent = (overrides?: Partial<FillEvent>): FillEvent => {
    return {
        fillTxHash: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321" as Hex,
        blockNumber: 2000000n,
        timestamp: Math.floor(Date.now() / 1000),
        originChainId: sepolia.id,
        orderId: "0x0000000000000000000000000000000000000000000000000000000000003039" as Hex,
        relayer: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" as Address,
        recipient: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
        ...overrides,
    };
};

export const createMockLog = (overrides?: Partial<Log>): Log => {
    return {
        address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
        blockHash: "0xaabbccdd1234567890aabbccdd1234567890aabbccdd1234567890aabbccdd12" as Hex,
        blockNumber: 2000000n,
        data: "0x",
        logIndex: 0,
        removed: false,
        topics: [],
        transactionHash:
            "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321" as Hex,
        transactionIndex: 0,
        ...overrides,
    } as Log;
};
