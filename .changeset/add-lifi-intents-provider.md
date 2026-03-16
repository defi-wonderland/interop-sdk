---
"@wonderland/interop-cross-chain": minor
---

feat: add LI.FI Intents cross-chain provider

Add LifiIntentsProvider integrating the LI.FI Intents solver marketplace:

-   Full CrossChainProvider implementation (getQuotes, getTrackingConfig, getDiscoveryConfig)
-   Adapters for quote request/response and order status mapping
-   LifiIntentsAssetDiscoveryService with caching and chain filtering
-   Zod schemas for config, quotes, status, and routes
-   Registered in crossChainProviderFactory as "lifi-intents"
