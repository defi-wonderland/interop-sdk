---
"@wonderland/interop-cross-chain": minor
---

Surface token `name` and `logoURI` on `DiscoveredAssetInfo`

-   `AssetInfo` (and therefore `DiscoveredAssetInfo`) gains optional `name` and `logoURI` fields.
-   Bungee, Across, LiFi Intents and Relay adapters now propagate every metadata field their endpoints actually return; `logoURI` is `undefined` for providers whose discovery endpoints don't include a logo (LiFi `/routes`, Relay `/chains`).
-   `toDiscoveredAssets` and `mergeDiscoveredAssets` keep the first non-empty `name` / `logoURI` when the same token shows up under multiple providers, matching how `providers[]` is already merged.
