import type { Hex } from "viem";
import { describe, expect, it } from "vitest";

import type { GetFillParams } from "../../../../src/core/types/orderTracking.js";
import type { BungeeStatusResponse } from "../../../../src/protocols/bungee/schemas.js";
import { OrderFailureReason, OrderStatus } from "../../../../src/core/types/orderTracking.js";
import { extractFillEvent } from "../../../../src/protocols/bungee/adapters/fillEventAdapter.js";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

function makeStatusResponse(
    bungeeStatusCode: number,
    fillTxHash: string | null = null,
): BungeeStatusResponse {
    return {
        success: true,
        statusCode: 200,
        result: [
            {
                hash: "0xorderhash",
                originData: {
                    input: [],
                    originChainId: 1,
                    txHash: "0xtx",
                    status: "FULFILLED",
                    userAddress: VALID_ADDRESS,
                },
                destinationData: {
                    output: null,
                    txHash: fillTxHash,
                    destinationChainId: 10,
                    receiverAddress: VALID_ADDRESS,
                    status: "FULFILLED",
                },
                routeDetails: {
                    name: "across",
                    logoURI: "https://example.com",
                },
                bungeeStatusCode,
                refund: null,
            },
        ],
    } as BungeeStatusResponse;
}

const FILL_PARAMS: GetFillParams = {
    orderId: "0xorderhash" as Hex,
    originChainId: 1,
    destinationChainId: 10,
};

describe("extractFillEvent", () => {
    it.each([
        [0, OrderStatus.Pending, undefined],
        [1, OrderStatus.Executing, undefined],
        [2, OrderStatus.Executing, undefined],
        [3, OrderStatus.Finalized, undefined],
        [4, OrderStatus.Finalized, undefined],
        [5, OrderStatus.Failed, OrderFailureReason.DeadlineExceeded],
        [6, OrderStatus.Failed, OrderFailureReason.Unknown],
        [7, OrderStatus.Refunded, undefined],
    ])("maps bungee status code %i to %s", (code, expectedStatus, expectedReason) => {
        const result = extractFillEvent(makeStatusResponse(code), FILL_PARAMS);

        expect(result.status).toBe(expectedStatus);
        expect(result.failureReason).toBe(expectedReason);
    });

    it("creates FillEvent when finalized with fillTxHash", () => {
        const result = extractFillEvent(makeStatusResponse(3, "0xfilltx"), FILL_PARAMS);

        expect(result.event).not.toBeNull();
        expect(result.event?.fillTxHash).toBe("0xfilltx");
    });

    it("returns null event when not finalized", () => {
        const result = extractFillEvent(makeStatusResponse(0), FILL_PARAMS);

        expect(result.event).toBeNull();
    });

    it("returns null event when finalized but no fillTxHash", () => {
        const result = extractFillEvent(makeStatusResponse(3, null), FILL_PARAMS);

        expect(result.event).toBeNull();
    });
});
