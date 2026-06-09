import { isHex } from "viem";

import type { SubmitOrderResponse } from "../../../core/schemas/quote.js";
import type { SuperbridgeSubmitGaslessResponse } from "../schemas.js";
import { ProviderExecuteFailure } from "../../../internal.js";

/**
 * Build an SDK SubmitOrderResponse from a Superbridge gasless submission response.
 *
 * @throws {ProviderExecuteFailure} When the response carries no transaction hash.
 */
export function adaptSubmitGaslessResponse(
    response: SuperbridgeSubmitGaslessResponse,
): SubmitOrderResponse {
    const candidate = response.txHash ?? response.id;
    if (!candidate || !isHex(candidate)) {
        throw new ProviderExecuteFailure(
            "Superbridge gasless submission returned no transaction hash",
        );
    }

    return {
        orderId: candidate,
        status: response.status,
        message: response.message,
    };
}
