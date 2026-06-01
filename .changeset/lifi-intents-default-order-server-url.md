---
"@wonderland/interop-cross-chain": minor
---

Default the LiFi Intents `orderServerUrl` to the official endpoint (`https://order.li.fi`). `createCrossChainProvider("lifi-intents")` and `createAggregator({ providers: ["lifi-intents"] })` now work without config; pass `orderServerUrl` to override (e.g. `LIFI_INTENTS_ORDER_SERVER_DEV_URL`). Invalid URLs are still rejected.
