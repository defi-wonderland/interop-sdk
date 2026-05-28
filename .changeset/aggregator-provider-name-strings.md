---
"@wonderland/interop-cross-chain": minor
---

Accept protocol name strings in `createAggregator` providers

-   `createAggregator({ providers })` now accepts the optional-config protocol names `"across"`, `"relay"` and `"bungee"` alongside `CrossChainProvider` instances. Names are instantiated with default config via `createCrossChainProvider`, so `providers: ["across", "relay", "bungee"]` works without wiring each provider by hand. `oif` and `lifi-intents` still require instances since their config is mandatory.
-   The aggregator now throws `DuplicateProvider` when two providers resolve to the same `providerId` instead of silently overwriting one of them.
-   `AcrossProvider`'s default `providerId` is now the stable `"across"` (matching `relay` and `bungee`), instead of a `across_<uuid>` value that was generated once at module load. Pass an explicit `providerId` to run several Across providers in the same aggregator.
-   New exported types `AggregatorProvider`, `CreateAggregatorConfig` and `OptionalConfigProtocols`.
