import type { Quote } from "../schemas/quote.js";

/** A solver-returned target (spender, transaction `to`, or signature counterparty) that failed validation. */
export interface SpenderViolation {
    chainId: number;
    field: "spender" | "transactionTo" | "signatureRecipient";
    received: string;
    trusted: string[];
}

/**
 * Consumer-owned trusted address list. The SDK doesn't maintain protocol deployment
 * addresses, so it doesn't decide which settlers or routers are the canonical ones.
 * It validates each quote's counterparties against a list the consumer provides and
 * maintains. A built-in list of trusted settlers may land later; for now it's yours to own.
 */
export interface SpenderValidator {
    findViolation(quote: Quote): SpenderViolation | null;
}
