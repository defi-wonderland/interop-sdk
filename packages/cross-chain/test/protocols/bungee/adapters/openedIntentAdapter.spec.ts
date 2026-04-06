import type { Hex } from "viem";
import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { OpenedIntentNotFoundError } from "../../../../src/core/errors/OpenedIntentNotFound.exception.js";
import { extractOpenedIntent } from "../../../../src/protocols/bungee/adapters/openedIntentAdapter.js";

const USER_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const RECEIVER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const TX_HASH = "0xdeadbeef" as Hex;

const INPUT_TOKEN = {
    chainId: 1,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
};

const OUTPUT_TOKEN = {
    chainId: 10,
    address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
};

function buildStatusResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        success: true,
        statusCode: 200,
        result: [
            {
                hash: "0xstatushash",
                originData: {
                    input: [
                        { token: INPUT_TOKEN, amount: "1000000", priceInUsd: 1, valueInUsd: 1 },
                    ],
                    originChainId: 1,
                    txHash: "0xtx",
                    status: "PENDING",
                    userAddress: USER_ADDRESS,
                    timestamp: 1700000000,
                },
                destinationData: {
                    output: [
                        {
                            token: OUTPUT_TOKEN,
                            amount: "990000",
                            priceInUsd: 1,
                            valueInUsd: 0.99,
                            minAmountOut: "980000",
                        },
                    ],
                    txHash: null,
                    destinationChainId: 10,
                    receiverAddress: RECEIVER_ADDRESS,
                    status: "PENDING",
                    timestamp: 1700003600,
                },
                routeDetails: {
                    name: "across",
                    logoURI: "https://example.com",
                },
                bungeeStatusCode: 0,
            },
        ],
        ...overrides,
    };
}

describe("extractOpenedIntent", () => {
    it("extracts OpenedIntent from valid response", () => {
        const response = buildStatusResponse();
        const result = extractOpenedIntent(response, TX_HASH);

        expect(result.originChainId).toBe(1);
        expect(result.fillInstructions[0].destinationChainId).toBe(10);
        expect(result.orderId).toBe("0xstatushash");
        expect(result.txHash).toBe(TX_HASH);
    });

    it("populates user from originData.userAddress", () => {
        const response = buildStatusResponse();
        const result = extractOpenedIntent(response, TX_HASH);

        expect(result.user).toBe(USER_ADDRESS);
    });

    it("populates maxSpent from originData.input", () => {
        const response = buildStatusResponse();
        const result = extractOpenedIntent(response, TX_HASH);

        expect(result.maxSpent).toHaveLength(1);
        expect(result.maxSpent[0]).toEqual({
            token: INPUT_TOKEN.address,
            amount: BigInt("1000000"),
            recipient: USER_ADDRESS,
            chainId: 1,
        });
    });

    it("populates minReceived from destinationData.output", () => {
        const response = buildStatusResponse();
        const result = extractOpenedIntent(response, TX_HASH);

        expect(result.minReceived).toHaveLength(1);
        expect(result.minReceived[0]).toEqual({
            token: OUTPUT_TOKEN.address,
            amount: BigInt("990000"),
            recipient: RECEIVER_ADDRESS,
            chainId: 10,
        });
    });

    it("returns empty minReceived when output is null", () => {
        const response = buildStatusResponse();
        const resultArr = response.result as Record<string, unknown>[];
        (resultArr[0]!.destinationData as Record<string, unknown>).output = null;

        const result = extractOpenedIntent(response, TX_HASH);

        expect(result.minReceived).toEqual([]);
    });

    it("populates deadlines from timestamps", () => {
        const response = buildStatusResponse();
        const result = extractOpenedIntent(response, TX_HASH);

        expect(result.openDeadline).toBe(1700000000);
        expect(result.fillDeadline).toBe(1700003600);
    });

    it("defaults openDeadline to 0 and fillDeadline to max when timestamps are missing", () => {
        const response = buildStatusResponse();
        const resultArr = response.result as Record<string, unknown>[];
        const entry = resultArr[0]! as Record<string, unknown>;
        (entry.originData as Record<string, unknown>).timestamp = null;
        (entry.destinationData as Record<string, unknown>).timestamp = null;

        const result = extractOpenedIntent(response, TX_HASH);

        expect(result.openDeadline).toBe(0);
        expect(result.fillDeadline).toBe(0xffffffff);
    });

    it("uses zeroAddress for originContract", () => {
        const response = buildStatusResponse();
        const result = extractOpenedIntent(response, TX_HASH);

        expect(result.originContract).toBe(zeroAddress);
    });

    it("throws OpenedIntentNotFoundError for invalid response", () => {
        expect(() => extractOpenedIntent({}, TX_HASH)).toThrow(OpenedIntentNotFoundError);
    });

    it("throws OpenedIntentNotFoundError for empty result", () => {
        const response = { success: true, statusCode: 200, result: [] };

        expect(() => extractOpenedIntent(response, TX_HASH)).toThrow(OpenedIntentNotFoundError);
    });
});
