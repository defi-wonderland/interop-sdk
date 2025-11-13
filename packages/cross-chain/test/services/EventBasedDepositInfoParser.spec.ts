import type viem from "viem";
import { Address, createPublicClient, Hex, Log, PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    DepositEventNotFoundError,
    DepositInfo,
    DepositInfoParserConfig,
    EventBasedDepositInfoParser,
} from "../../src/internal.js";
import { PublicClientManager } from "../../src/utils/publicClientManager.js";

vi.mock("viem", async () => {
    return {
        ...(await vi.importActual<typeof viem>("viem")),
        createPublicClient: vi.fn(),
    };
});

describe("EventBasedDepositInfoParser", () => {
    let parser: EventBasedDepositInfoParser;
    let mockGetTransactionReceipt: ReturnType<typeof vi.fn>;
    let mockPublicClient: PublicClient;
    let config: DepositInfoParserConfig;

    const mockEventSignature =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
    const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;

    beforeEach(() => {
        vi.clearAllMocks();

        mockGetTransactionReceipt = vi.fn();

        mockPublicClient = {
            getTransactionReceipt: mockGetTransactionReceipt,
        } as unknown as PublicClient;

        vi.mocked(createPublicClient).mockReturnValue(mockPublicClient);

        config = {
            protocolName: "TestProtocol",
            eventSignature: mockEventSignature,
            extractDepositInfo: (log: Log): DepositInfo => ({
                depositId: BigInt(log.topics[1] || "0"),
                inputAmount: 1000000000000000000n,
                outputAmount: 990000000000000000n,
                destinationChainId: 84532n,
            }),
        };

        const clientManager = new PublicClientManager(mockPublicClient);
        parser = new EventBasedDepositInfoParser(config, { clientManager });
    });

    describe("getDepositInfo", () => {
        it("should extract deposit info when event found", async () => {
            const mockLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [
                    mockEventSignature,
                    "0x00000000000000000000000000000000000000000000000000000000000000ff" as Hex,
                ],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            });

            const result = await parser.getDepositInfo(mockTxHash, sepolia.id);

            expect(result).toEqual({
                depositId: 255n,
                inputAmount: 1000000000000000000n,
                outputAmount: 990000000000000000n,
                destinationChainId: 84532n,
            });
        });

        it("should throw DepositEventNotFoundError when event missing", async () => {
            mockGetTransactionReceipt.mockResolvedValue({
                logs: [],
                blockNumber: 1000000n,
            });

            await expect(parser.getDepositInfo(mockTxHash, sepolia.id)).rejects.toThrow(
                DepositEventNotFoundError,
            );
            await expect(parser.getDepositInfo(mockTxHash, sepolia.id)).rejects.toThrow(
                `TestProtocol deposit event not found in transaction ${mockTxHash}`,
            );
        });

        it("should throw error for unsupported chain", async () => {
            const unsupportedChainId = 999999;

            await expect(parser.getDepositInfo(mockTxHash, unsupportedChainId)).rejects.toThrow(
                "Unsupported chain ID",
            );
        });

        it("should find correct event among multiple logs", async () => {
            const otherEventSignature =
                "0x9999999999999999999999999999999999999999999999999999999999999999" as Hex;

            const otherLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [otherEventSignature],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            const depositLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 1,
                removed: false,
                topics: [
                    mockEventSignature,
                    "0x00000000000000000000000000000000000000000000000000000000000000ff" as Hex,
                ],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [otherLog, depositLog],
                blockNumber: 1000000n,
            });

            const result = await parser.getDepositInfo(mockTxHash, sepolia.id);

            expect(result.depositId).toBe(255n);
        });

        it("should call extractDepositInfo from config", async () => {
            const extractSpy = vi.fn().mockReturnValue({
                depositId: 999n,
                inputAmount: 2000000000000000000n,
                outputAmount: 1990000000000000000n,
                destinationChainId: 10n,
            });

            const customConfig: DepositInfoParserConfig = {
                ...config,
                extractDepositInfo: extractSpy,
            };

            const clientManager = new PublicClientManager(mockPublicClient);
            const customParser = new EventBasedDepositInfoParser(customConfig, { clientManager });

            const mockLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [mockEventSignature],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            });

            const result = await customParser.getDepositInfo(mockTxHash, sepolia.id);

            expect(extractSpy).toHaveBeenCalledWith(mockLog);
            expect(result.depositId).toBe(999n);
        });

        it("should throw error when getTransactionReceipt fails", async () => {
            mockGetTransactionReceipt.mockRejectedValue(new Error("RPC error"));

            await expect(parser.getDepositInfo(mockTxHash, sepolia.id)).rejects.toThrow(
                "RPC error",
            );
        });
    });
});
