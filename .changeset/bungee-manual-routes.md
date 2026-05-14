---
"@wonderland/interop-cross-chain": minor
---

Add Bungee manual routes via `enableOtherProviders`

-   `BungeeProvider` now accepts `enableOtherProviders?: boolean`. When set, `getQuotes` returns Bungee's auto routes plus a Quote per manual route — those served by other bridge protocols routed through Bungee.
-   Each manual route is built eagerly via `GET /api/v1/bungee/build-tx` so quotes ship with an executable `TransactionStep`. Per-route build failures are isolated and do not abort the auto route or the rest of the manuals.
-   Tracking is now split per flow so each polls Bungee with the right identifier:
    -   Auto routes set `tracking.orderId = requestHash` and the SDK polls `/status?requestHash=…` via `fillWatcherConfig`.
    -   Manual routes have no Bungee-issued requestHash, so the SDK polls `/status?txHash=${openTxHash}` via the new `onChainFillWatcherConfig` — no longer assuming the auto-route identifier shape works for manual flows.
-   `openedIntentParserConfig.buildUrl` now queries `/status?txHash=…` (previously `?requestHash=…`) so the parameter matches the on-chain origin tx hash it receives.
