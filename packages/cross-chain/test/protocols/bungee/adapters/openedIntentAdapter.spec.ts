import type { Hex } from "viem";
import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { OpenedIntentNotFoundError } from "../../../../src/core/errors/OpenedIntentNotFound.exception.js";
import { extractOpenedIntent } from "../../../../src/protocols/bungee/adapters/openedIntentAdapter.js";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const TX_HASH = "0xdeadbeef" as Hex;

function buildStatusResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        success: true,
        statusCode: 200,
        result: [
            {
                hash: "0xstatushash",
                originData: {
                    input: [],
                    originChainId: 1,
                    txHash: "0xtx",
                    status: "PENDING",
                    userAddress: VALID_ADDRESS,
                },
                destinationData: {
                    output: null,
                    txHash: null,
                    destinationChainId: 10,
                    receiverAddress: VALID_ADDRESS,
                    status: "PENDING",
                },
                routeDetails: {
                    name: "across",
                    logoURI: "https://example.com",
                },
                bungeeStatusCode: 0,
            },
        ],
        ...overrides,
    };
}

describe("extractOpenedIntent", () => {
    it("extracts OpenedIntent from valid response", () => {
        const response = buildStatusResponse();
        const result = extractOpenedIntent(response, TX_HASH);

        expect(result.originChainId).toBe(1);
        expect(result.fillInstructions[0].destinationChainId).toBe(10);
        expect(result.orderId).toBe("0xstatushash");
        expect(result.txHash).toBe(TX_HASH);
    });

    it("uses zeroAddress for user and originContract", () => {
        const response = buildStatusResponse();
        const result = extractOpenedIntent(response, TX_HASH);

        expect(result.user).toBe(zeroAddress);
        expect(result.originContract).toBe(zeroAddress);
    });

    it("throws OpenedIntentNotFoundError for invalid response", () => {
        expect(() => extractOpenedIntent({}, TX_HASH)).toThrow(OpenedIntentNotFoundError);
    });

    it("throws OpenedIntentNotFoundError for empty result", () => {
        const response = { success: true, statusCode: 200, result: [] };

        expect(() => extractOpenedIntent(response, TX_HASH)).toThrow(OpenedIntentNotFoundError);
    });
});
