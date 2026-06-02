import { ProviderGetQuoteFailure } from "./ProviderGetQuoteFailure.exception.js";

/** Thrown when a solver-returned order has more array entries than the SDK verifies against the intent. */
export class UnverifiedOrderEntries extends ProviderGetQuoteFailure {
    public readonly orderType: string;
    public readonly field: string;
    public readonly count: number;

    constructor(orderType: string, field: string, count: number) {
        super(
            `${orderType} order carries ${count} "${field}" entries; only one is supported, the rest are unverified`,
        );
        this.orderType = orderType;
        this.field = field;
        this.count = count;
    }
}
