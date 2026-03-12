import { Address, Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    APIOpenedIntentParser,
    APIOpenedIntentParserConfig,
    APIRequestFailure,
    OpenedIntent,
    OpenedIntentNotFoundError,
} from "../../src/internal.js";

const MOCK_BASE_URL = "https://api.test.com";

const createMockConfig = (
    overrides?: Partial<APIOpenedIntentParserConfig>,
): APIOpenedIntentParserConfig => ({
    protocolName: "test-protocol",
    buildUrl: (txHash: Hex, _chainId: number): string =>
        `${MOCK_BASE_URL}/intents/status/v3?requestId=${txHash}`,
    extractOpenedIntent: (_response: unknown, txHash: Hex): OpenedIntent => ({
        orderId: txHash,
        txHash,
        blockNumber: 0n,
        originContract: "0x0000000000000000000000000000000000000000" as Address,
        user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
        originChainId: 11155111,
        openDeadline: 0,
        fillDeadline: 0,
        maxSpent: [],
        minReceived: [],
        fillInstructions: [],
    }),
    ...overrides,
});

const MOCK_TX_HASH = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;
const MOCK_CHAIN_ID = 11155111;

describe("APIOpenedIntentParser", () => {
    let parser: APIOpenedIntentParser;
    let mockConfig: APIOpenedIntentParserConfig;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        mockConfig = createMockConfig();
        parser = new APIOpenedIntentParser(mockConfig);
    });

    describe("getOpenedIntent", () => {
        it("calls the API endpoint with txHash as requestId", async () => {
            const mockResponse = { status: "pending", originChainId: 11155111 };
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

            await parser.getOpenedIntent(MOCK_TX_HASH, MOCK_CHAIN_ID);

            expect(fetchSpy).toHaveBeenCalledWith(
                `${MOCK_BASE_URL}/intents/status/v3?requestId=${MOCK_TX_HASH}`,
                { headers: { "Content-Type": "application/json" } },
            );
        });

        it("returns OpenedIntent from extractOpenedIntent", async () => {
            const mockResponse = { status: "pending", originChainId: 11155111 };
            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response(JSON.stringify(mockResponse), { status: 200 }),
            );

            const result = await parser.getOpenedIntent(MOCK_TX_HASH, MOCK_CHAIN_ID);

            expect(result.orderId).toBe(MOCK_TX_HASH);
            expect(result.txHash).toBe(MOCK_TX_HASH);
            expect(result.originChainId).toBe(11155111);
        });

        it("passes API response to extractOpenedIntent", async () => {
            const mockResponse = { status: "success", originChainId: 42161 };
            const extractSpy = vi.fn().mockReturnValue({
                orderId: MOCK_TX_HASH,
                txHash: MOCK_TX_HASH,
                blockNumber: 0n,
                originContract: "0x0000000000000000000000000000000000000000" as Address,
                user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
                originChainId: 42161,
                openDeadline: 0,
                fillDeadline: 0,
                maxSpent: [],
                minReceived: [],
                fillInstructions: [],
            });

            const config = createMockConfig({ extractOpenedIntent: extractSpy });
            const customParser = new APIOpenedIntentParser(config);

            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response(JSON.stringify(mockResponse), { status: 200 }),
            );

            await customParser.getOpenedIntent(MOCK_TX_HASH, MOCK_CHAIN_ID);

            expect(extractSpy).toHaveBeenCalledWith(mockResponse, MOCK_TX_HASH);
        });

        it("throws OpenedIntentNotFoundError on 404 response", async () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response("Not Found", { status: 404 }),
            );

            await expect(parser.getOpenedIntent(MOCK_TX_HASH, MOCK_CHAIN_ID)).rejects.toThrow(
                OpenedIntentNotFoundError,
            );
        });

        it("throws APIRequestFailure with status and body on non-404 failure", async () => {
            vi.spyOn(globalThis, "fetch").mockImplementation(() =>
                Promise.resolve(new Response("Server Error", { status: 500 })),
            );

            const error = await parser
                .getOpenedIntent(MOCK_TX_HASH, MOCK_CHAIN_ID)
                .catch((e: APIRequestFailure) => e);

            expect(error).toBeInstanceOf(APIRequestFailure);
            expect(error).toMatchObject({ status: 500, body: "Server Error" });
        });

        it("throws APIRequestFailure on 429 rate limit", async () => {
            vi.spyOn(globalThis, "fetch").mockImplementation(() =>
                Promise.resolve(new Response("Rate limited", { status: 429 })),
            );

            const error = await parser
                .getOpenedIntent(MOCK_TX_HASH, MOCK_CHAIN_ID)
                .catch((e: APIRequestFailure) => e);

            expect(error).toBeInstanceOf(APIRequestFailure);
            expect(error).not.toBeInstanceOf(OpenedIntentNotFoundError);
            expect(error).toMatchObject({ status: 429, body: "Rate limited" });
        });

        it("propagates errors thrown by extractOpenedIntent", async () => {
            const config = createMockConfig({
                extractOpenedIntent: () => {
                    throw new OpenedIntentNotFoundError(MOCK_TX_HASH, "test-protocol");
                },
            });
            const customParser = new APIOpenedIntentParser(config);

            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response(JSON.stringify({}), { status: 200 }),
            );

            await expect(customParser.getOpenedIntent(MOCK_TX_HASH, MOCK_CHAIN_ID)).rejects.toThrow(
                OpenedIntentNotFoundError,
            );
        });

        it("propagates fetch errors", async () => {
            vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network failure"));

            await expect(parser.getOpenedIntent(MOCK_TX_HASH, MOCK_CHAIN_ID)).rejects.toThrow(
                "Network failure",
            );
        });
    });
});
