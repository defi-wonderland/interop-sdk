---
"@wonderland/interop-cross-chain": minor
---

Wire Superbridge into the provider factory and aggregator

Register `superbridge` in `PROTOCOLS`, `SupportedProtocolsConfigs` and `PROTOCOL_FACTORIES`, and export `SuperbridgeProvider`/`SuperbridgeConfigs` from the package entrypoint. `createCrossChainProvider("superbridge", { apiKey })` now returns a `SuperbridgeProvider`, and the aggregator accepts a `SuperbridgeProvider` instance. Its config is required (`apiKey`), so — like `oif` — `superbridge` is not an optional-config protocol and is passed to `createAggregator` as an instance, not a bare string.
