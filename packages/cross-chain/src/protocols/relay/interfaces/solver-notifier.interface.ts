import type { GetFillParams } from "../../../core/types/orderTracking.js";

/**
 * Notifies a solver about a submitted deposit transaction.
 */
export interface SolverNotifier {
    /** Notify the solver about an order's deposit transaction. */
    notify(params: GetFillParams): Promise<void>;
}
