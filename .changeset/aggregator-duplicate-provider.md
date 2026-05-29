---
"@wonderland/interop-cross-chain": minor
---

Throw `DuplicateProvider` on conflicting provider IDs

`createAggregator` now throws the new `DuplicateProvider` error when two providers resolve to the same `providerId`, instead of silently overwriting one of them. Providers are indexed by a `Map`, so any string (including reserved object keys like `toString` or `__proto__`) is treated as an ordinary id.
