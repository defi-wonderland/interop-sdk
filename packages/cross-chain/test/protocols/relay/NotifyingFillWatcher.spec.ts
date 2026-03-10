import type { Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FillWatcher } from "../../../src/core/interfaces/fillWatcher.interface.js";
import type { FillEvent, GetFillParams } from "../../../src/core/types/orderTracking.js";
import type { SolverNotifier } from "../../../src/protocols/relay/RelaySolverNotifier.js";
import { OrderStatus } from "../../../src/core/types/orderTracking.js";
import { NotifyingFillWatcher } from "../../../src/protocols/relay/NotifyingFillWatcher.js";

const ORDER_ID_1 = "0xorder1" as Hex;
const ORDER_ID_2 = "0xorder2" as Hex;
const TX_HASH = "0xtx1" as Hex;
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;

const MOCK_FILL_EVENT: FillEvent = {
    fillTxHash: "0xfill" as Hex,
    timestamp: 1700000000,
    originChainId: ORIGIN_CHAIN_ID,
    orderId: ORDER_ID_1,
};

describe("NotifyingFillWatcher", () => {
    let inner: FillWatcher;
    let notifier: SolverNotifier;
    let watcher: NotifyingFillWatcher;

    beforeEach(() => {
        inner = {
            getFill: vi.fn().mockResolvedValue({
                fillEvent: null,
                status: OrderStatus.Pending,
            }),
            waitForFill: vi.fn().mockResolvedValue(MOCK_FILL_EVENT),
        };
        notifier = { notify: vi.fn().mockResolvedValue(undefined) };
        watcher = new NotifyingFillWatcher(inner, notifier);
    });

    function makeParams(overrides?: Partial<GetFillParams>): GetFillParams {
        return {
            orderId: ORDER_ID_1,
            openTxHash: TX_HASH,
            originChainId: ORIGIN_CHAIN_ID,
            destinationChainId: DESTINATION_CHAIN_ID,
            ...overrides,
        };
    }

    describe("getFill()", () => {
        it("delegates to inner watcher", async () => {
            const params = makeParams();
            const result = await watcher.getFill(params);

            expect(inner.getFill).toHaveBeenCalledWith(params);
            expect(result.status).toBe(OrderStatus.Pending);
        });

        it("calls notifier before delegating", async () => {
            const params = makeParams();
            await watcher.getFill(params);

            expect(notifier.notify).toHaveBeenCalledWith(params);
        });

        it("notifies only once per orderId", async () => {
            const params = makeParams();
            await watcher.getFill(params);
            await watcher.getFill(params);
            await watcher.getFill(params);

            expect(notifier.notify).toHaveBeenCalledTimes(1);
        });

        it("notifies separately for different orderIds", async () => {
            await watcher.getFill(makeParams({ orderId: ORDER_ID_1 }));
            await watcher.getFill(makeParams({ orderId: ORDER_ID_2 }));

            expect(notifier.notify).toHaveBeenCalledTimes(2);
        });
    });

    describe("waitForFill()", () => {
        it("delegates to inner watcher", async () => {
            const params = makeParams();
            const result = await watcher.waitForFill(params, 5000);

            expect(inner.waitForFill).toHaveBeenCalledWith(params, 5000);
            expect(result).toBe(MOCK_FILL_EVENT);
        });

        it("calls notifier before delegating", async () => {
            await watcher.waitForFill(makeParams());

            expect(notifier.notify).toHaveBeenCalledTimes(1);
        });

        it("notifies only once across getFill and waitForFill", async () => {
            const params = makeParams();
            await watcher.getFill(params);
            await watcher.waitForFill(params);

            expect(notifier.notify).toHaveBeenCalledTimes(1);
        });
    });

    describe("error handling", () => {
        it("swallows notifier errors and still delegates to inner", async () => {
            vi.mocked(notifier.notify).mockRejectedValue(new Error("Network Error"));

            const params = makeParams();
            const result = await watcher.getFill(params);

            expect(inner.getFill).toHaveBeenCalledWith(params);
            expect(result.status).toBe(OrderStatus.Pending);
        });

        it("does not retry after notifier error", async () => {
            vi.mocked(notifier.notify).mockRejectedValue(new Error("fail"));

            const params = makeParams();
            await watcher.getFill(params);
            await watcher.getFill(params);

            // Called once (idempotent), not retried
            expect(notifier.notify).toHaveBeenCalledTimes(1);
        });
    });
});
