---
"@wonderland/interop-cross-chain": minor
---

feat: add OIF asset discovery service

Add asset discovery capability to the SDK, enabling providers to declare supported chains and tokens. Implements the OIF standard (GET /api/tokens).

-   Query supported assets and chains from providers via `getSupportedAssets()`, `getAssetsForChain()`, `isAssetSupported()`, and `getSupportedChainIds()`
-   Built-in caching and schema validation
-   Support for OIF-compliant solvers, custom APIs, and static asset lists
-   Optional filtering by chain IDs
