---
"@wonderland/interop-cross-chain": patch
---

Bungee provider now returns an empty array instead of throwing when the API responds successfully with no routes (e.g. amounts below the protocol minimum). Real API errors (4xx/5xx, validation failures) are still surfaced.
