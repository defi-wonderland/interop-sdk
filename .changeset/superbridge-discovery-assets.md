---
"@wonderland/interop-cross-chain": minor
---

Add Superbridge asset discovery

Wire `SuperbridgeProvider.getDiscoveryConfig` on top of the paginated `/v1/tokens` endpoint, exposing the Superbridge token list through `custom-api` discovery. `parseSuperbridgeTokens` groups the tokens by chain id into `NetworkAssets[]`. Adds a unit test on the discovery adapter.
