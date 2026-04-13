import type { QuoteFees } from "../../../core/schemas/quote.js";
import type { BungeeAutoRoute } from "../schemas.js";

/** Map Bungee auto route fee fields to the SDK-standard QuoteFees shape. */
export function adaptFees(autoRoute: BungeeAutoRoute): QuoteFees | undefined {
    const gasFee = autoRoute.gasFee;
    const routeFee = autoRoute.routeDetails?.routeFee;

    if (!gasFee && !routeFee) return undefined;

    const fees: QuoteFees = {};

    if (gasFee) {
        fees.originGas = {
            amount: gasFee.estimatedFee,
            amountUsd: String(gasFee.feeInUsd),
            token: {
                symbol: gasFee.gasToken.symbol,
                decimals: gasFee.gasToken.decimals,
                address: gasFee.gasToken.address,
            },
        };
    }

    if (routeFee) {
        fees.bridgeFee = {
            amount: routeFee.amount,
            amountUsd: String(routeFee.feeInUsd),
            token: {
                symbol: routeFee.token.symbol,
                decimals: routeFee.token.decimals,
                address: routeFee.token.address,
            },
        };
    }

    return fees;
}
