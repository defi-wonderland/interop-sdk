---
"@wonderland/interop-cross-chain": minor
---

Use a stable default `providerId` for Across

`AcrossProvider`'s default `providerId` is now the stable `"across"` (matching `relay` and `bungee`), instead of an `across_<uuid>` value generated once at module load. Because the default is stable, adding two Across providers with default config to the same aggregator now resolves to the same id and throws `DuplicateProvider`; pass an explicit `providerId` to run several Across providers.
