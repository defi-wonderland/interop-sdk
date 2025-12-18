import { PostOrderResponse, PostOrderResponseStatus } from "@openintentsframework/oif-specs";
import axios from "axios";
import { createWalletClient, http, isHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OifProvider } from "../../src/external.js";
import { getMockedOifQuoteResponse, MOCK_QUOTE_IDS } from "../mocks/oifApi.js";

vi.mock("axios");

const MOCK_SOLVER_URL = "https://mock-solver.example.com";
const MOCK_SOLVER_ID = "mock-solver-1";

describe("OifProvider Integration Tests", () => {
    let provider: OifProvider;

    beforeEach(() => {
        provider = new OifProvider({
            solverId: MOCK_SOLVER_ID,
            url: MOCK_SOLVER_URL,
        });
        vi.clearAllMocks();
    });

    describe("viem wallet signing flow", () => {
        it("should work end-to-end with viem WalletClient", async () => {
            const testPrivateKey = generatePrivateKey();
            const account = privateKeyToAccount(testPrivateKey);
            const walletClient = createWalletClient({
                account,
                chain: mainnet,
                transport: http(),
            });

            // Using standard 20-byte addresses because EIP-712 'address' type must be exactly 20 bytes.
            // OIF solvers accept ERC-7930 in requests but return standard addresses in EIP-712 messages.
            const mockResponse = getMockedOifQuoteResponse({ useInteroperableAddresses: false });
            const quote = mockResponse.quotes[0];
            if (!quote) throw new Error("No quote in mock");
            if (quote.order.type !== "oif-escrow-v0") throw new Error("Expected escrow order");

            const { domain, primaryType, message, types } = quote.order.payload;
            const signature = await walletClient.signTypedData({
                domain,
                primaryType,
                message: message as Record<string, unknown>,
                types,
            });

            expect(isHex(signature)).toBe(true);

            const mockPostOrderResponse: PostOrderResponse = {
                orderId: "viem-integration-order-id",
                status: PostOrderResponseStatus.Received,
                message: "Order received",
            };

            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: mockPostOrderResponse,
            });

            const result = await provider.submitSignedOrder(quote, signature);

            expect(result).toEqual(mockPostOrderResponse);

            const postCall = vi.mocked(axios.post).mock.calls[0];
            expect(postCall).toBeDefined();
            const [url, body] = postCall as [
                string,
                { order: unknown; signature: Uint8Array; quoteId?: string },
            ];
            expect(url).toBe(`${MOCK_SOLVER_URL}/v1/orders`);
            expect(body.signature).toBeInstanceOf(Uint8Array);
            expect(body.signature).toHaveLength(65);
            expect(body.quoteId).toBe(MOCK_QUOTE_IDS.ESCROW_STANDARD);
        });
    });
});
