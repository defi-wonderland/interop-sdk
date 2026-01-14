import type { GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { Order } from "../types/oif.js";

// TODO: Implement proper OIF payload validation
export function validateOifPayload(_userIntent: GetQuoteRequest, _order: Order): boolean {
    return true;
}
