---
"@wonderland/interop-cross-chain": minor
---

Make discovery's conflict guard same-asset aware

Discovery still drops tokens whose sources disagree on `symbol`/`decimals`, fail-closed, with two refinements. Empty symbols now count as missing data and are backfilled from other sources instead of conflicting. And addresses resolved by a configured `sameAssetService` survive symbol disagreements — the consumer's map already attests their identity, so providers labeling the same token differently (e.g. `USDT` vs `USDT0`) no longer makes it disappear. Decimals disagreements always drop the token.
