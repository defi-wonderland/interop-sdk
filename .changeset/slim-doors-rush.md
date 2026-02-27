---
"@wonderland/interop-cross-chain": minor
---

feat: replace OIF wire types with SDK-friendly types across the entire public API

-   **`InteropAccountId`** — `{ chainId, address }` replaces ERC-7930 hex blobs
-   **Step-based `Order`** — `SignatureStep | TransactionStep` replaces the 4-variant OIF order union and `AcrossOrder`
-   **`QuoteRequest`** — flat structure: `user` is a plain string, singular `input`/`output` at top level, `swapType` at top level
-   **`Quote` / `ExecutableQuote`** — step-based order, readable preview, provider metadata
-   **`CrossChainProvider`** interface now speaks SDK types: `getQuotes(QuoteRequest): Promise<Quote[]>`, `submitOrder()` replaces `submitSignedOrder()`
-   OIF wire-format conversion is internal to `OifProvider`; Across builds SDK types directly
-   `Aggregator` (renamed from `ProviderExecutor`) is a thin aggregation layer — passes `QuoteRequest` to providers, delegates `submitOrder()` to providers
-   **`OifProviderConfig`** — new optional fields: `supportedLocks` and `submissionModes`
-   New utilities: `toInteropAccountId`, `fromInteropAccountId`, `getSignatureSteps`, `getTransactionSteps`, `isSignatureOnlyOrder`, `isTransactionOnlyOrder`
