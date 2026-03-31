---
"@wonderland/interop-cross-chain": minor
---

Restrict buildQuote to same-asset cross-chain transfers only. Same-chain intents are now rejected with `SameChainIntentNotAllowed`. When input and output tokens differ, a `DifferentAssetNotAllowed` error is thrown directing users to `getQuotes()` for cross-token swaps. Cross-chain transfers with unavailable token metadata are also blocked unless `allowDangerousParameters` is set.
