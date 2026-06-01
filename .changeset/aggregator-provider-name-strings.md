---
"@wonderland/interop-cross-chain": minor
---

Accept protocol name strings in `createAggregator` providers

`createAggregator({ providers })` now accepts the optional-config protocol names `"across"`, `"relay"` and `"bungee"` alongside `CrossChainProvider` instances. Names are instantiated with default config via `createCrossChainProvider`, so `providers: ["across", "relay", "bungee"]` works without wiring each provider by hand. `oif` and `lifi-intents` still require instances since their config is mandatory.
