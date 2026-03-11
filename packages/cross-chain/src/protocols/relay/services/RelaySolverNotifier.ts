import type { AxiosInstance } from "axios";

import type { GetFillParams } from "../../../core/types/orderTracking.js";
import type { SolverNotifier } from "../types.js";

/**
 * POSTs to Relay's `/transactions/index` endpoint to accelerate indexing
 * of deposit transactions. Must be called immediately after tx submission,
 * before polling status.
 *
 * @see https://docs.relay.link/references/api/index-transaction
 */
export class RelaySolverNotifier implements SolverNotifier {
    constructor(private readonly http: AxiosInstance) {}

    async notify(params: GetFillParams): Promise<void> {
        if (!params.openTxHash) return;

        await this.http.post("/transactions/index", {
            txHash: params.openTxHash,
            chainId: String(params.originChainId),
        });
    }
}
