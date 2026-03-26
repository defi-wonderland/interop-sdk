import type { QuoteFeeEntry, QuoteFees } from "../../../core/schemas/quote.js";
import type { RelayQuoteResponse } from "../schemas.js";

/** Map Relay fee fields to the SDK-standard QuoteFees shape. */
export function adaptFees(response: RelayQuoteResponse): QuoteFees | undefined {
    const relayerFee = response.fees?.relayer;
    const gasFee = response.fees?.gas;

    if (!relayerFee && !gasFee) return undefined;

    return {
        bridgeFee: relayerFee ? toFeeEntry(relayerFee) : undefined,
        originGas: gasFee ? toFeeEntry(gasFee) : undefined,
    };
}

/** Map a Relay fee entry (with `currency`) to an SDK QuoteFeeEntry. */
function toFeeEntry(fee: {
    amount: string;
    amountUsd?: string;
    currency: { symbol: string; decimals: number; address: string };
}): QuoteFeeEntry {
    return {
        amount: fee.amount,
        amountUsd: fee.amountUsd,
        token: {
            symbol: fee.currency.symbol,
            decimals: fee.currency.decimals,
            address: fee.currency.address,
        },
    };
}
