import type viem from "viem";
import { createPublicClient, Hex, PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OpenEventNotFoundError, OpenEventWatcher } from "../../src/services/OpenEventWatcher.js";

vi.mock("viem", async () => {
    return {
        ...(await vi.importActual<typeof viem>("viem")),
        createPublicClient: vi.fn(),
    };
});

describe("OpenEventWatcher", () => {
    let watcher: OpenEventWatcher;
    let mockGetTransactionReceipt: ReturnType<typeof vi.fn>;
    let mockGetBlockNumber: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockGetTransactionReceipt = vi.fn();
        mockGetBlockNumber = vi.fn();

        const mockPublicClient = {
            getTransactionReceipt: mockGetTransactionReceipt,
            getBlockNumber: mockGetBlockNumber,
        } as unknown as PublicClient;

        vi.mocked(createPublicClient).mockReturnValue(mockPublicClient);

        watcher = new OpenEventWatcher();
    });

    describe("getOpenEvent", () => {
        it("should throw OpenEventNotFoundError when Open event is missing", async () => {
            const txHash = "0xtest" as Hex;

            // Mock receipt without Open event
            mockGetTransactionReceipt.mockResolvedValue({
                logs: [],
                blockNumber: 123n,
            });

            await expect(watcher.getOpenEvent(txHash, sepolia.id)).rejects.toThrow(
                OpenEventNotFoundError,
            );
        });

        it("should throw error for unsupported chain", async () => {
            const txHash = "0xtest" as Hex;
            const unsupportedChainId = 999999;

            await expect(watcher.getOpenEvent(txHash, unsupportedChainId)).rejects.toThrow(
                "Unsupported chain ID",
            );
        });

        // NOTE: Full end-to-end validation with real testnet data happens in test-transfer.ts
        // Mocking viem's event decoding is complex and fragile
        // The working example proves the parsing works correctly with actual testnet transactions
    });

    describe("getAcrossDepositInfo", () => {
        it("should parse Across FundsDeposited event", async () => {
            const txHash = "0xtest" as Hex;
            const depositId = 123n;
            const destinationChainId = 84532n;

            // Mock transaction receipt with FundsDeposited event
            // Event signature for FundsDeposited
            const fundsDepositedSig =
                "0x32ed1a409ef04c7b0227189c3a103dc5ac10e775a15b785dcc510201f7c25ad3";

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [
                    {
                        topics: [fundsDepositedSig, destinationChainId, depositId],
                        data:
                            "0x" +
                            "00".repeat(32) +
                            "00".repeat(32) +
                            "2710" +
                            "0".repeat(60) +
                            "24e6" +
                            "0".repeat(60), // inputAmount=10000, outputAmount=9446
                    },
                ],
            });

            const result = await watcher.getAcrossDepositInfo(txHash, sepolia.id);

            expect(result).toBeDefined();
            expect(result.depositId).toBe(depositId);
            expect(result.destinationChainId).toBe(destinationChainId);
        });

        // NOTE: Full end-to-end validation with real testnet data happens in test-transfer.ts
        // Mocking viem's manual data extraction is complex and fragile
        // The working example proves the parsing works correctly with actual testnet transactions
    });
});
