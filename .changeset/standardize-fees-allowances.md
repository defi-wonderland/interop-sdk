---
"@wonderland/interop-cross-chain": minor
---

feat: standardize fees and allowances across providers

-   Add `QuoteFeesSchema` to `QuoteSchema` with `bridgeFee`, `bridgeFeePct`, and `originGas`
-   Populate `quote.fees` in Relay and Across adapters
-   Extract Relay approve steps into `order.checks.allowances`
-   Export `QuoteFeeEntry` and `QuoteFees` types
