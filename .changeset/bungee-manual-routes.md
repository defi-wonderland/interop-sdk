---
"@wonderland/interop-cross-chain": minor
---

Add Bungee manual routes via `enableOtherProviders`

-   `BungeeProvider` now accepts `enableOtherProviders?: boolean`. When set, `getQuotes` returns Bungee's auto routes plus a Quote per manual route — those served by Across, Stargate, Mayan, Synapse and other bridge protocols routed through Bungee.
-   Each manual route is built eagerly via `GET /api/v1/bungee/build-tx` so quotes ship with an executable `TransactionStep`. Per-route build failures are isolated and do not abort the auto route or the rest of the manuals.
-   Tracking is now split per flow so each polls Bungee with the right identifier:
    -   Auto routes set `tracking.orderId = requestHash` and the SDK polls `/status?requestHash=…` via `fillWatcherConfig`.
    -   Manual routes have no Bungee-issued requestHash, so the SDK polls `/status?txHash=${openTxHash}` via the new `onChainFillWatcherConfig` — no longer assuming the auto-route identifier shape works for manual flows.
-   Endpoint URL building is centralized in `BungeeApiService.buildStatusPath(query)` with a discriminated `{ kind: "txHash" | "requestHash" }` input, so the query parameter cannot be mismatched at the call site.
