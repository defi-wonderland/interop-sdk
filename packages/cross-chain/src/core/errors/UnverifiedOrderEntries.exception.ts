import { ProviderGetQuoteFailure } from "./ProviderGetQuoteFailure.exception.js";

export type UnverifiedOrderType = "oif-escrow-v0" | "oif-resource-lock-v0" | "oif-user-open-v0";
export type UnverifiedOrderField = "permitted" | "commitments" | "allowances";

/** Thrown when a solver-returned order has more array entries than the SDK verifies against the intent. */
export class UnverifiedOrderEntries extends ProviderGetQuoteFailure {
    public readonly orderType: UnverifiedOrderType;
    public readonly field: UnverifiedOrderField;
    public readonly count: number;

    constructor(orderType: UnverifiedOrderType, field: UnverifiedOrderField, count: number) {
        super(
            `${orderType} order carries ${count} "${field}" entries; only one is supported, the rest are unverified`,
        );
        this.orderType = orderType;
        this.field = field;
        this.count = count;
    }
}
