import { describe, expect, it } from "vitest";

import { OpenedIntentNotFoundError } from "../../../../src/core/errors/OpenedIntentNotFound.exception.js";
import { adaptOpenedIntentResponse } from "../../../../src/protocols/superbridge/adapters/openedIntentResponseAdapter.js";

const ORIGIN_TX = "0x0riginaa00000000000000000000000000000000000000000000000000000000";

describe("adaptOpenedIntentResponse", () => {
    it("returns the opened intent with the destination chain", () => {
        const response = [
            {
                id: "bridge-1",
                fromChainId: "1",
                toChainId: "8453",
                steps: [
                    {
                        type: "transaction",
                        transactionStatus: "done",
                        confirmation: { transactionHash: ORIGIN_TX },
                    },
                ],
            },
        ];

        const intent = adaptOpenedIntentResponse(response, ORIGIN_TX);

        expect(intent.orderId).toBe(ORIGIN_TX);
        expect(intent.originChainId).toBe(1);
        expect(intent.fillInstructions[0]!.destinationChainId).toBe(8453);
    });

    it("throws when no activity matches", () => {
        expect(() => adaptOpenedIntentResponse([], ORIGIN_TX)).toThrow(OpenedIntentNotFoundError);
    });

    it("throws when the destination chain is missing", () => {
        const response = [
            {
                id: "bridge-1",
                fromChainId: "1",
                steps: [
                    {
                        type: "transaction",
                        transactionStatus: "done",
                        confirmation: { transactionHash: ORIGIN_TX },
                    },
                ],
            },
        ];

        expect(() => adaptOpenedIntentResponse(response, ORIGIN_TX)).toThrow(
            OpenedIntentNotFoundError,
        );
    });

    it("throws when the origin chain is missing", () => {
        const response = [
            {
                id: "bridge-1",
                toChainId: "8453",
                steps: [
                    {
                        type: "transaction",
                        transactionStatus: "done",
                        confirmation: { transactionHash: ORIGIN_TX },
                    },
                ],
            },
        ];

        expect(() => adaptOpenedIntentResponse(response, ORIGIN_TX)).toThrow(
            OpenedIntentNotFoundError,
        );
    });
});
