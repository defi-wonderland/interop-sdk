---
"@wonderland/interop-cross-chain": minor
---

feat: add Relay protocol provider (POC)

-   **`RelayProvider`** — new cross-chain provider for [Relay](https://relay.link) bridge transfers and swaps
-   Supports `POST /quote/v2` for fetching quotes and `GET /intents/status/v3` for order tracking
-   Transaction-based execution (same pattern as Across) with multi-step order support (approve + deposit)
-   Configurable API key, source header, and testnet/mainnet switching
-   Tracking via `requestId` polling (not txHash-based)
-   Registered in factory: `createCrossChainProvider("relay", config?)`
-   POC limitations: no asset discovery, no payload validation, signature steps excluded
