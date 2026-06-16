---
"@wonderland/interop-cross-chain": minor
---

Scaffold the Superbridge provider

Add the package skeleton for `SuperbridgeProvider` under `src/protocols/superbridge/`, following the Bungee/Relay layout. The provider validates its config and builds the HTTP client; `apiKey` is optional and only sent as `x-api-key` when present, so consumers can route through a proxy (`baseUrl`) that injects the key server-side instead of exposing it client-side. `getQuotes` and `getTrackingConfig` throw `ProviderExecuteNotImplemented` until later issues fill them in. Wired only through the internal module, not yet exported from the public surface or the provider factory, so consumer-facing behavior is unchanged.
