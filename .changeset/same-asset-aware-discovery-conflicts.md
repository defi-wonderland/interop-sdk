---
"@wonderland/interop-cross-chain": minor
---

Add an opt-in same-asset conflict guard to asset discovery

Without a `sameAssetService` configured, discovery keeps its first-write-wins merging — providers naming the same token differently (e.g. `USDT` vs `USDT0`) never makes tokens disappear. Empty symbols now count as missing data and are backfilled from other sources.

When a `sameAssetService` is configured, the aggregator's merged discovery drops tokens whose sources disagree on `symbol`/`decimals` and logs a warning — except addresses the service resolves, which are kept and exposed under the consumer's asset id.
