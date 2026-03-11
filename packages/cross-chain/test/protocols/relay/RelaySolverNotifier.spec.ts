import type { AxiosInstance } from "axios";
import type { Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetFillParams } from "../../../src/core/types/orderTracking.js";
import { RelaySolverNotifier } from "../../../src/protocols/relay/services/RelaySolverNotifier.js";

const ORDER_ID = "0xorder1" as Hex;
const TX_HASH = "0xtx1" as Hex;
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;

describe("RelaySolverNotifier", () => {
    let notifier: RelaySolverNotifier;
    let mockPost: ReturnType<typeof vi.fn>;
    let http: AxiosInstance;

    beforeEach(() => {
        mockPost = vi.fn().mockResolvedValue({ data: {} });
        http = { post: mockPost } as unknown as AxiosInstance;
        notifier = new RelaySolverNotifier(http);
    });

    function makeParams(overrides?: Partial<GetFillParams>): GetFillParams {
        return {
            orderId: ORDER_ID,
            openTxHash: TX_HASH,
            originChainId: ORIGIN_CHAIN_ID,
            destinationChainId: DESTINATION_CHAIN_ID,
            ...overrides,
        };
    }

    it("POSTs to /transactions/index with txHash and chainId", async () => {
        await notifier.notify(makeParams());

        expect(mockPost).toHaveBeenCalledWith("/transactions/index", {
            txHash: TX_HASH,
            chainId: String(ORIGIN_CHAIN_ID),
        });
    });

    it("skips notification when openTxHash is missing", async () => {
        await notifier.notify(makeParams({ openTxHash: undefined }));

        expect(mockPost).not.toHaveBeenCalled();
    });

    it("propagates HTTP errors", async () => {
        mockPost.mockRejectedValue(new Error("Network Error"));

        await expect(notifier.notify(makeParams())).rejects.toThrow("Network Error");
    });
});
