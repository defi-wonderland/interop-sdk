---
"@wonderland/interop-cross-chain": minor
---

Scaffold the Superbridge provider

Add the package skeleton for `SuperbridgeProvider` under `src/protocols/superbridge/`, following the Bungee/Relay layout. The provider validates its config (`apiKey` required) and builds the HTTP client; `getQuotes` and `getTrackingConfig` throw `ProviderExecuteNotImplemented` until later issues fill them in. Wired only through the internal module, not yet exported from the public surface or the provider factory, so consumer-facing behavior is unchanged.
