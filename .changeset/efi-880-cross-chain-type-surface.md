---
"@wonderland/interop-cross-chain": minor
---

Clean up `cross-chain` public type surface (EFI-880):

-   Re-export `GetQuotesError` and `GetQuotesResponse` from the package entrypoint so consumers can name the return type of `Aggregator.getQuotes`.
-   Narrow `createCrossChainProvider` to `SupportedProtocols`. The factory now has two overloads (one for protocols whose config is required, one for protocols whose config is optional) plus a generic implementation, and does an exhaustiveness check on the protocol name. Unknown protocol strings are now a compile error instead of a runtime throw.
-   Drop the `StepResult[]` variant from `Aggregator.submitOrder`. The signature is now `submitOrder(quote, signature: Hex)`. No provider currently produces multi-step signature orders, so this variant was untested surface area. Callers passing a `StepResult[]` should extract the signature themselves (e.g. via `getSignatureSteps`) before calling.
-   Remove the unused token constants from `core/constants/tokens.ts`: `MAINNET_SUPPORTED_TOKEN_BY_CHAIN_ID`, `TESTNET_SUPPORTED_TOKEN_BY_CHAIN_ID`, `SUPPORTED_TOKEN_BY_CHAIN_ID`, `MAINNET_TOKEN_INFO`, and `TESTNET_TOKEN_INFO`. These were partial bootstrap lists with no in-repo consumers and implied authority they didn't have. For a runtime-accurate view of supported tokens per configuration, use `aggregator.discoverAssets()`. The `TokenInfo` type remains exported.
