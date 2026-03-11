import type { Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetFillParams } from "../../../src/core/types/orderTracking.js";
import type { RelayApiService } from "../../../src/protocols/relay/services/RelayApiService.js";
import { RelaySolverNotifier } from "../../../src/protocols/relay/services/RelaySolverNotifier.js";

const ORDER_ID = "0xorder1" as Hex;
const TX_HASH = "0xtx1" as Hex;
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;

describe("RelaySolverNotifier", () => {
    let notifier: RelaySolverNotifier;
    let mockIndexTransaction: ReturnType<typeof vi.fn>;
    let apiService: RelayApiService;

    beforeEach(() => {
        mockIndexTransaction = vi.fn().mockResolvedValue({ message: "ok" });
        apiService = { indexTransaction: mockIndexTransaction } as unknown as RelayApiService;
        notifier = new RelaySolverNotifier(apiService);
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

    it("calls indexTransaction with txHash and chainId", async () => {
        await notifier.notify(makeParams());

        expect(mockIndexTransaction).toHaveBeenCalledWith({
            txHash: TX_HASH,
            chainId: String(ORIGIN_CHAIN_ID),
        });
    });

    it("skips notification when openTxHash is missing", async () => {
        await notifier.notify(makeParams({ openTxHash: undefined }));

        expect(mockIndexTransaction).not.toHaveBeenCalled();
    });

    it("propagates API errors", async () => {
        mockIndexTransaction.mockRejectedValue(new Error("Network Error"));

        await expect(notifier.notify(makeParams())).rejects.toThrow("Network Error");
    });
});
