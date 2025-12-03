import type { PostOrderResponse, Quote } from "@wonderland/interop-oif-specs";
import type { EIP1193Provider, PrepareTransactionRequestReturnType } from "viem";

export type QuoteExecution = (signer: EIP1193Provider) => Promise<PostOrderResponse>;

export interface ExecutableQuote extends Quote {
    preparedTransaction: PrepareTransactionRequestReturnType;
    execute: QuoteExecution;
}
