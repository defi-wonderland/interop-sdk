---
"@wonderland/interop-cross-chain": patch
---

Remove unused `@across-protocol/app-sdk` dependency. The Across provider talks to the API directly via axios; the SDK was only referenced by a dead test mock, which has been deleted.
