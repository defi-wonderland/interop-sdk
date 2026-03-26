---
"@wonderland/cross-chain": minor
---

Restrict buildQuote to same-asset transfers only. When input and output tokens differ, a `DifferentAssetNotAllowed` error is thrown directing users to `getQuotes()` for cross-token swaps where solvers handle pricing. Cross-chain transfers with unavailable token metadata are allowed through as "unknown".
