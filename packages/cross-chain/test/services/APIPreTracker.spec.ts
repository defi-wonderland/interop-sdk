import type { Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PreTrackerParams } from "../../src/core/interfaces/preTracker.interface.js";
import type { APIPreTrackerConfig } from "../../src/core/services/APIPreTracker.js";
import { HttpError } from "../../src/core/errors/HttpError.exception.js";
import { httpRequest } from "../../src/core/utils/httpClient.js";
import { APIPreTracker, APIRequestFailure } from "../../src/internal.js";

vi.mock("../../src/core/utils/httpClient.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../src/core/utils/httpClient.js")>();
    return {
        ...actual,
        httpRequest: vi.fn(),
    };
});

// ── Constants ────────────────────────────────────────────

const BASE_URL = "https://api.relay.link";
const INDEX_ENDPOINT = "/transactions/index";
const PROTOCOL_NAME = "relay";
const TX_HASH = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;
const ORIGIN_CHAIN_ID = 1;
const ORDER_ID = "0xorder456" as Hex;

// ── Helpers ──────────────────────────────────────────────

function makeHttpError(status: number, data: unknown): HttpError {
    return new HttpError(
        `Request failed with status ${status}`,
        `${BASE_URL}${INDEX_ENDPOINT}`,
        status,
        data,
    );
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
            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: {},
                headers: new Headers(),
            });

            await preTracker.execute(makeParams());

            expect(httpRequest).toHaveBeenCalledWith(`${BASE_URL}${INDEX_ENDPOINT}`, {
                method: "POST",
                body: { chainId: String(ORIGIN_CHAIN_ID), txHash: TX_HASH },
                headers: undefined,
                timeout: 15000,
            });
        });

        it("includes orderId as requestId when provided", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: {},
                headers: new Headers(),
            });

            await preTracker.execute(makeParams({ orderId: ORDER_ID }));

            expect(httpRequest).toHaveBeenCalledWith(`${BASE_URL}${INDEX_ENDPOINT}`, {
                method: "POST",
                body: {
                    chainId: String(ORIGIN_CHAIN_ID),
                    txHash: TX_HASH,
                    requestId: ORDER_ID,
                },
                headers: undefined,
                timeout: 15000,
            });
        });

        it("passes custom headers when configured", async () => {
            const headers = { "x-api-key": "test-key" };
            preTracker = new APIPreTracker(makeConfig({ headers }));
            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: {},
                headers: new Headers(),
            });

            await preTracker.execute(makeParams());

            expect(httpRequest).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ headers, timeout: 15000 }),
            );
        });

        it("uses custom timeoutMs when configured", async () => {
            preTracker = new APIPreTracker(makeConfig({ timeoutMs: 3000 }));
            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: {},
                headers: new Headers(),
            });

            await preTracker.execute(makeParams());

            expect(httpRequest).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ headers: undefined, timeout: 3000 }),
            );
        });

        it("wraps HttpError into APIRequestFailure with status and body", async () => {
            const httpError = makeHttpError(500, "Internal Server Error");
            vi.mocked(httpRequest).mockRejectedValueOnce(httpError);

            await expect(preTracker.execute(makeParams())).rejects.toMatchObject({
                constructor: APIRequestFailure,
                status: 500,
                body: "Internal Server Error",
            });
        });

        it("wraps HttpError with JSON response data into APIRequestFailure", async () => {
            const httpError = makeHttpError(400, { message: "Invalid txHash" });
            vi.mocked(httpRequest).mockRejectedValueOnce(httpError);

            await expect(preTracker.execute(makeParams())).rejects.toMatchObject({
                constructor: APIRequestFailure,
                status: 400,
                body: JSON.stringify({ message: "Invalid txHash" }),
            });
        });

        it("re-throws non-HTTP errors as-is", async () => {
            const networkError = new Error("DNS resolution failed");
            vi.mocked(httpRequest).mockRejectedValueOnce(networkError);

            await expect(preTracker.execute(makeParams())).rejects.toThrow("DNS resolution failed");
        });

        it("resolves without error on success", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: { message: "ok" },
                headers: new Headers(),
            });

            await expect(preTracker.execute(makeParams())).resolves.toBeUndefined();
        });
    });
});
