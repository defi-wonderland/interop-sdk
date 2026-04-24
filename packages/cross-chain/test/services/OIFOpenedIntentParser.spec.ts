import type { Address, Hex, Log, PublicClient } from "viem";
import { encodeAbiParameters } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    InvalidOpenEventError,
    OIFOpenedIntentParser,
    OIFOpenEventNotFoundError,
    PublicClientManager,
} from "../../src/internal.js";
import {
    OIF_INPUT_SETTLER_ESCROW_BY_CHAIN,
    OIF_OPEN_EVENT_SIGNATURE,
} from "../../src/protocols/oif/constants.js";

/**
 * Create a mock Open event log with OIF StandardOrder data.
 */
const createMockOpenEventLog = (overrides?: Partial<Log>): Log => {
    const orderId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
    const user = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address;
    const originChainId = 42161n;
    const nonce = 1700000000000n;
    const expires = 1700003900;
    const fillDeadline = 1700003600;
    const inputOracle = "0x0b88D54A39F330Dd7e773af4806BDC490c79cAB6" as Address;
    const inputToken = BigInt("0x7e13e59a15e4703a54a0976ddd970f8fe52d3a76");
    const inputAmount = 1000000n;
    const outputOracle =
        "0x0000000000000000000000000b88D54A39F330Dd7e773af4806BDC490c79cAB6" as Hex;
    const outputSettler =
        "0x0000000000000000000000002404F8e3c37c002c89bA78086a119e68E3fF8824" as Hex;
    const outputChainId = 8453n;
    const outputToken = "0x000000000000000000000000c0b782920b2de8b55f08fc98004eb5c7d4fbf287" as Hex;
    const outputAmount = 960000n;
    const recipient = "0x000000000000000000000000d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Hex;

    const data = encodeAbiParameters(
        [
            {
                type: "tuple",
                components: [
                    { type: "address", name: "user" },
                    { type: "uint256", name: "nonce" },
                    { type: "uint256", name: "originChainId" },
                    { type: "uint32", name: "expires" },
                    { type: "uint32", name: "fillDeadline" },
                    { type: "address", name: "inputOracle" },
                    { type: "uint256[2][]", name: "inputs" },
                    {
                        type: "tuple[]",
                        name: "outputs",
                        components: [
                            { type: "bytes32", name: "oracle" },
                            { type: "bytes32", name: "settler" },
                            { type: "uint256", name: "chainId" },
                            { type: "bytes32", name: "token" },
                            { type: "uint256", name: "amount" },
                            { type: "bytes32", name: "recipient" },
                            { type: "bytes", name: "callbackData" },
                            { type: "bytes", name: "context" },
                        ],
                    },
                ],
            },
        ],
        [
            {
                user,
                nonce,
                originChainId,
                expires,
                fillDeadline,
                inputOracle,
                inputs: [[inputToken, inputAmount]],
                outputs: [
                    {
                        oracle: outputOracle,
                        settler: outputSettler,
                        chainId: outputChainId,
                        token: outputToken,
                        amount: outputAmount,
                        recipient,
                        callbackData: "0x",
                        context: "0x",
                    },
                ],
            },
        ],
    );

    return {
        address: OIF_INPUT_SETTLER_ESCROW_BY_CHAIN[42161]! as Address,
        blockHash: "0xblockhash" as Hex,
        blockNumber: 100n,
        data,
        logIndex: 0,
        topics: [OIF_OPEN_EVENT_SIGNATURE, orderId],
        transactionHash: "0xtxhash" as Hex,
        transactionIndex: 0,
        removed: false,
        ...overrides,
    };
};

const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;
const mockChainId = 42161;

describe("OIFOpenedIntentParser", () => {
    let parser: OIFOpenedIntentParser;
    let mockGetTransactionReceipt: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockGetTransactionReceipt = vi.fn();

        const mockClientManager = {
            getClient: vi.fn().mockReturnValue({
                getTransactionReceipt: mockGetTransactionReceipt,
            } as unknown as PublicClient),
        } as unknown as PublicClientManager;

        parser = new OIFOpenedIntentParser({ clientManager: mockClientManager });
    });

    it("parses a valid OIF StandardOrder Open event", async () => {
        const openLog = createMockOpenEventLog();

        mockGetTransactionReceipt.mockResolvedValue({
            logs: [openLog],
            blockNumber: 100n,
        });

        const intent = await parser.getOpenedIntent(mockTxHash, mockChainId);

        expect(intent.orderId).toBe(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        );
        expect(intent.user.toLowerCase()).toBe(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045".toLowerCase(),
        );
        expect(intent.originChainId).toBe(42161);
        expect(intent.fillDeadline).toBe(1700003600);
        expect(intent.openDeadline).toBe(1700003900); // mapped from expires
        expect(intent.maxSpent).toHaveLength(1);
        expect(intent.maxSpent[0]!.amount).toBe(1000000n);
        expect(intent.minReceived).toHaveLength(1);
        expect(intent.minReceived[0]!.amount).toBe(960000n);
        expect(intent.minReceived[0]!.chainId).toBe(8453);
        expect(intent.fillInstructions).toHaveLength(1);
        expect(intent.fillInstructions[0]!.destinationChainId).toBe(8453);
    });

    it("throws OIFOpenEventNotFoundError when no Open event in receipt", async () => {
        mockGetTransactionReceipt.mockResolvedValue({
            logs: [],
            blockNumber: 100n,
        });

        await expect(parser.getOpenedIntent(mockTxHash, mockChainId)).rejects.toBeInstanceOf(
            OIFOpenEventNotFoundError,
        );
    });

    it("throws InvalidOpenEventError when event data is malformed", async () => {
        const badLog = createMockOpenEventLog({ data: "0x0000" as Hex });

        mockGetTransactionReceipt.mockResolvedValue({
            logs: [badLog],
            blockNumber: 100n,
        });

        await expect(parser.getOpenedIntent(mockTxHash, mockChainId)).rejects.toBeInstanceOf(
            InvalidOpenEventError,
        );
    });

    it("includes SDK metadata in the result", async () => {
        const openLog = createMockOpenEventLog();
        mockGetTransactionReceipt.mockResolvedValue({
            logs: [openLog],
            blockNumber: 100n,
        });

        const intent = await parser.getOpenedIntent(mockTxHash, mockChainId);

        expect(intent.txHash).toBe(mockTxHash);
        expect(intent.blockNumber).toBe(100n);
        expect(intent.originContract.toLowerCase()).toBe(
            OIF_INPUT_SETTLER_ESCROW_BY_CHAIN[42161]!.toLowerCase(),
        );
    });
});
