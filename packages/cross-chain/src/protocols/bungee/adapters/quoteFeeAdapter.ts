import type { QuoteFees } from "../../../core/schemas/quote.js";
import type { BungeeAutoRoute, BungeeManualRoute } from "../schemas.js";

/**
 * Map Bungee fee fields to the SDK-standard QuoteFees shape.
 * Works for both auto routes and manual routes — they share the relevant fee fields.
 */
export function adaptFees(route: BungeeAutoRoute | BungeeManualRoute): QuoteFees | undefined {
    const gasFee = route.gasFee;
    const routeFee = route.routeDetails?.routeFee;

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
