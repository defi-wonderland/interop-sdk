import { describe, expect, it } from "vitest";

import { ProviderExecuteFailure } from "../../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { adaptSubmitGaslessResponse } from "../../../../src/protocols/superbridge/adapters/submitGaslessResponseAdapter.js";

const FILL_TX = "0xabc1230000000000000000000000000000000000000000000000000000000000";

describe("adaptSubmitGaslessResponse", () => {
    it("maps a submission response to a submit order response", () => {
        expect(adaptSubmitGaslessResponse({ txHash: FILL_TX, status: "submitted" })).toEqual({
            orderId: FILL_TX,
            status: "submitted",
            message: undefined,
        });
    });

    it("throws when the response carries no transaction hash", () => {
        expect(() => adaptSubmitGaslessResponse({ id: "uuid-not-hex" })).toThrow(
            ProviderExecuteFailure,
        );
    });
});
