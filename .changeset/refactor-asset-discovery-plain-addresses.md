---
"@wonderland/interop-cross-chain": minor
---

Refactor asset discovery to use plain addresses and numeric chain IDs

-   `DiscoveredAssets.tokensByChain` now uses numeric chain ID keys (e.g. `1`) instead of CAIP-350 strings (e.g. `"eip155:1"`)
-   `DiscoveredAssets.tokenMetadata` is now nested by chain ID then lowercase address to prevent cross-chain collisions
-   `AssetInfo.address` uses plain `0x` format instead of EIP-7930 interop encoding
-   `RouteQuery` now takes `originChainId`, `originAsset`, `destinationChainId`, `destinationAsset` (4 fields) instead of two EIP-7930 addresses
-   Removed `encodeAddress`/`toChainIdentifier` dependencies from asset discovery pipeline
-   Removed `toEVMInteropAddress` helper (no longer needed)
