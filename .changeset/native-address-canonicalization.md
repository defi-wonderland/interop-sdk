---
"@wonderland/interop-cross-chain": patch
---

Normalize native token placeholders to the canonical `NATIVE_ASSET_ADDRESS` (EIP-7528 `0xEEE…E`) across discovery, routing, validation, and asset-support lookups, deduplicating ETH in `DiscoveredAssets` when providers report different sentinels (Bungee: `0xEEE…E`, Across/Relay/LI.FI Intents/OIF: `0x000…0`). Each provider's quote-request adapter translates the canonical address to the placeholder its API expects, so callers can pass either variant without breaking any provider. Adds the public `toCanonicalNativeAddress` helper.
