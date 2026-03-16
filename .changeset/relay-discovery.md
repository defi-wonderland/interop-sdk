---
"@wonderland/interop-cross-chain": minor
---

feat: add automatic token discovery for Relay bridge

-   Add `getDiscoveryConfig()` to RelayProvider using GET `/chains` with `solverCurrencies`
-   Static testnet tokens for Sepolia and Base Sepolia
-   Full `RelayChainsResponseSchema` matching the OpenAPI spec
