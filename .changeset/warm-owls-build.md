---
"@wonderland/interop-cross-chain": minor
---

feat: add buildQuote for on-chain intent submission without a solver API

-   Add `buildQuote` method to `CrossChainProvider` base class (opt-in, default throws)
-   Implement `buildQuote` in `OifProvider` using ERC-7683 `open()` calldata encoding
-   Implement `buildQuote` in `AcrossProvider` using `SpokePool.deposit()` calldata encoding
-   Add `BuildQuoteRequest` schema with required amounts, escrow contract address, and fill deadline
-   Expose `buildQuote` on the `Aggregator` for provider-routed local quote building
