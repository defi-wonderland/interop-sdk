import type { GetFillParams } from "../../../core/types/orderTracking.js";
import type { SolverNotifier } from "../interfaces/index.js";
import type { RelayApiService } from "./RelayApiService.js";

/**
 * POSTs to Relay's `/transactions/index` endpoint to accelerate indexing
 * of deposit transactions. Must be called immediately after tx submission,
 * before polling status.
 *
 * @see https://docs.relay.link/references/api/index-transaction
 */
export class RelaySolverNotifier implements SolverNotifier {
    constructor(private readonly apiService: RelayApiService) {}

    async notify(params: GetFillParams): Promise<void> {
        if (!params.openTxHash) return;

        await this.apiService.indexTransaction({
            txHash: params.openTxHash,
            chainId: String(params.originChainId),
        });
    }
}
