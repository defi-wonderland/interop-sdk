---
"@wonderland/interop-cross-chain": patch
---

Quotes now expose an `eta` (estimated seconds until fill) across every protocol. When a provider does not return its own ETA, the SDK falls back to the deadline embedded in the quote response (`quoteExpiryTimestamp` for Across, `quoteExpiry` for Bungee, `protocol.v2.orderData.output.deadline` for Relay) or, for LiFi Intents, decoded directly from the open-intent calldata since the response does not surface any deadline of its own.

The fallback policy lives in a single `EtaResolverService` that adapters depend on, so the rule is uniform across protocols and easy to extend if new deadline candidates appear.
