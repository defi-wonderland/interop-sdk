import type { QuoteFeeEntry, QuoteFees } from "../../../core/schemas/quote.js";
import type { BungeeAutoRoute } from "../schemas.js";

/** Map Bungee auto route fee fields to the SDK-standard QuoteFees shape. */
export function adaptFees(autoRoute: BungeeAutoRoute): QuoteFees | undefined {
    const gasFee = autoRoute.gasFee;

    if (!gasFee) return undefined;

    const originGas: QuoteFeeEntry = {
        amount: gasFee.estimatedFee,
        amountUsd: String(gasFee.feeInUsd),
        token: {
            symbol: gasFee.gasToken.symbol,
            decimals: gasFee.gasToken.decimals,
            address: gasFee.gasToken.address,
        },
    };

    return { originGas };
}
