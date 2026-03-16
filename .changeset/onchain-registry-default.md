---
"@wonderland/interop-addresses": minor
---

feat: enable onchain chain registry (on.eth) by default

-   Replace `useExperimentalChainRegistry` with `onchainRegistry`, `offchainRegistryFallback`, and `rpcUrl` options
-   Onchain resolution via `on.eth` is now the default when parsing chain labels
-   Add default public RPC endpoint so onchain resolution works without configuration
-   Offchain chainid.network registry used as automatic fallback
-   Fully-qualified CAIP-2 identifiers (e.g., `eip155:10`) always work regardless of registry settings
