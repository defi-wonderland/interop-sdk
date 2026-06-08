import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
    HttpClient,
    HttpResponse,
} from "../../../src/core/interfaces/httpClient.interface.js";
import { HttpError } from "../../../src/core/errors/HttpError.exception.js";
import { ProviderExecuteFailure } from "../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { SuperbridgeApiService } from "../../../src/protocols/superbridge/services/SuperbridgeApiService.js";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

function mockOk<T>(data: T): HttpResponse<T> {
    return { status: 200, data, headers: new Headers() };
}

describe("SuperbridgeApiService", () => {
    let service: SuperbridgeApiService;
    let mockGet: ReturnType<typeof vi.fn>;
    let mockPost: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGet = vi.fn();
        mockPost = vi.fn();
        const http: HttpClient = { get: mockGet, post: mockPost, request: vi.fn() };
        service = new SuperbridgeApiService(http);
    });

    describe("getRoutes()", () => {
        it("validates the request and returns the parsed response", async () => {
            mockPost.mockResolvedValue(mockOk({ results: [] }));

            const result = await service.getRoutes({
                fromTokenAddress: VALID_ADDRESS,
                toTokenAddress: VALID_ADDRESS,
                amount: "1000",
                slippage: 0,
            });

            expect(result.results).toEqual([]);
            expect(mockPost).toHaveBeenCalledWith(
                "/v1/routes",
                expect.objectContaining({ amount: "1000" }),
            );
        });

        it("wraps rate limit errors with ProviderGetQuoteFailure", async () => {
            mockPost.mockRejectedValue(new HttpError("rate", "https://x", 429, {}));

            await expect(
                service.getRoutes({
                    fromTokenAddress: VALID_ADDRESS,
                    toTokenAddress: VALID_ADDRESS,
                    amount: "1000",
                    slippage: 0,
                }),
            ).rejects.toThrow(ProviderGetQuoteFailure);
        });
    });

    describe("getActivity()", () => {
        it("requests the activity by tx hash and returns the parsed response", async () => {
            mockGet.mockResolvedValue(
                mockOk([
                    { id: "bridge-1", steps: [{ type: "transaction", transactionStatus: "done" }] },
                ]),
            );

            const result = await service.getActivity("0xabc");

            expect(result).toHaveLength(1);
            expect(mockGet).toHaveBeenCalledWith("/v1/activity?txHash=0xabc");
        });

        it("wraps errors with ProviderExecuteFailure", async () => {
            mockGet.mockRejectedValue(new HttpError("bad", "https://x", 500, { message: "boom" }));

            await expect(service.getActivity("0xabc")).rejects.toThrow(ProviderExecuteFailure);
        });
    });

    describe("submitGasless()", () => {
        it("returns the parsed submission response", async () => {
            mockPost.mockResolvedValue(mockOk({ txHash: "0xabc", status: "submitted" }));

            const result = await service.submitGasless({ typedData: "{}", signature: "0xsig" });

            expect(result.txHash).toBe("0xabc");
        });
    });
});
