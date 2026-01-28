---
"@wonderland/interop-cross-chain": minor
---

feat: add API-based order tracking and refresh tracking docs

-   Add API-based fill watcher support for provider-driven tracking (e.g. Across mainnet deposit status polling)
-   Default Across tracking to API-based on mainnet and event-based on testnet, with `isTestnet` configuration
-   Update docs to describe onchain vs offchain tracking flows and full `OrderStatus` lifecycle
