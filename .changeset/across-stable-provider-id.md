---
"@wonderland/interop-cross-chain": patch
---

Use a stable default `providerId` for Across

`AcrossProvider`'s default `providerId` is now the stable `"across"` (matching `relay` and `bungee`), instead of an `across_<uuid>` value generated once at module load. Pass an explicit `providerId` to run several Across providers in the same aggregator.
