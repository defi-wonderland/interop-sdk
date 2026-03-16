import type { Hex } from "viem";
import axios, { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PreTrackerParams } from "../../src/core/interfaces/preTracker.interface.js";
import type { APIPreTrackerConfig } from "../../src/core/services/APIPreTracker.js";
import { APIPreTracker, APIRequestFailure } from "../../src/internal.js";

vi.mock("axios");

// ── Constants ────────────────────────────────────────────

const BASE_URL = "https://api.relay.link";
const INDEX_ENDPOINT = "/transactions/index";
const PROTOCOL_NAME = "relay";
const TX_HASH = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;
const ORIGIN_CHAIN_ID = 1;
const ORDER_ID = "0xorder456" as Hex;

// ── Helpers ──────────────────────────────────────────────

function makeAxiosError(status: number, data: unknown): AxiosError {
    const error = new AxiosError("Request failed");
    error.response = {
        status,
        data,
        statusText: "",
        headers: {},
        config: {} as never,
    };
    return error;
}

function makeConfig(overrides?: Partial<APIPreTrackerConfig>): APIPreTrackerConfig {
    return {
        type: "api",
        protocolName: PROTOCOL_NAME,
        buildUrl: () => `${BASE_URL}${INDEX_ENDPOINT}`,
        buildBody: (params: PreTrackerParams) => ({
            chainId: String(params.originChainId),
            txHash: params.txHash,
            ...(params.orderId && { requestId: params.orderId }),
        }),
        ...overrides,
    };
}

function makeParams(overrides?: Partial<PreTrackerParams>): PreTrackerParams {
    return {
        txHash: TX_HASH,
        originChainId: ORIGIN_CHAIN_ID,
        ...overrides,
    };
}

// ── Tests ────────────────────────────────────────────────

describe("APIPreTracker", () => {
    let preTracker: APIPreTracker;
    let config: APIPreTrackerConfig;

    beforeEach(() => {
        vi.clearAllMocks();
        config = makeConfig();
        preTracker = new APIPreTracker(config);
    });

    describe("execute()", () => {
        it("sends POST request to the configured URL with body", async () => {
            vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: {} });

            await preTracker.execute(makeParams());

            expect(axios.post).toHaveBeenCalledWith(
                `${BASE_URL}${INDEX_ENDPOINT}`,
                { chainId: String(ORIGIN_CHAIN_ID), txHash: TX_HASH },
                { headers: undefined },
            );
        });

        it("includes orderId as requestId when provided", async () => {
            vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: {} });

            await preTracker.execute(makeParams({ orderId: ORDER_ID }));

            expect(axios.post).toHaveBeenCalledWith(
                `${BASE_URL}${INDEX_ENDPOINT}`,
                { chainId: String(ORIGIN_CHAIN_ID), txHash: TX_HASH, requestId: ORDER_ID },
                { headers: undefined },
            );
        });

        it("passes custom headers when configured", async () => {
            const headers = { "x-api-key": "test-key" };
            preTracker = new APIPreTracker(makeConfig({ headers }));
            vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: {} });

            await preTracker.execute(makeParams());

            expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.any(Object), {
                headers,
            });
        });

        it("wraps AxiosError into APIRequestFailure with status and body", async () => {
            const axiosError = makeAxiosError(500, "Internal Server Error");
            vi.mocked(axios.post).mockRejectedValueOnce(axiosError);
            vi.mocked(axios.isAxiosError).mockReturnValue(true);

            const error = await preTracker.execute(makeParams()).catch((e: APIRequestFailure) => e);

            expect(error).toBeInstanceOf(APIRequestFailure);
            expect(error.status).toBe(500);
            expect(error.body).toBe("Internal Server Error");
        });

        it("wraps AxiosError with JSON response data into APIRequestFailure", async () => {
            const axiosError = makeAxiosError(400, { message: "Invalid txHash" });
            vi.mocked(axios.post).mockRejectedValueOnce(axiosError);
            vi.mocked(axios.isAxiosError).mockReturnValue(true);

            const error = await preTracker.execute(makeParams()).catch((e: APIRequestFailure) => e);

            expect(error).toBeInstanceOf(APIRequestFailure);
            expect(error.status).toBe(400);
            expect(error.body).toBe(JSON.stringify({ message: "Invalid txHash" }));
        });

        it("re-throws non-Axios errors as-is", async () => {
            const networkError = new Error("DNS resolution failed");
            vi.mocked(axios.post).mockRejectedValueOnce(networkError);
            vi.mocked(axios.isAxiosError).mockReturnValue(false);

            await expect(preTracker.execute(makeParams())).rejects.toThrow("DNS resolution failed");
        });

        it("resolves without error on success", async () => {
            vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: { message: "ok" } });

            await expect(preTracker.execute(makeParams())).resolves.toBeUndefined();
        });
    });
});
