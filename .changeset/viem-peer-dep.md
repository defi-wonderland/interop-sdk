---
"@wonderland/interop-cross-chain": minor
"@wonderland/interop-addresses": minor
"@wonderland/interop": minor
---

Move `viem` from a direct dependency to a peer dependency (`^2.28.0`). Consumers must now install `viem` alongside these packages. This avoids duplicate viem installs and lets apps control the exact `viem` version. The `@wonderland/interop` facade propagates the same peer requirement.
