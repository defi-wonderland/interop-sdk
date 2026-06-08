---
"@wonderland/interop-cross-chain": patch
---

Drop tokens with conflicting metadata from discovery results

Discovery results used first-write-wins for `symbol`/`decimals`, so a malicious discovery source could relabel a token and have downstream checks trust it. When sources disagree on a token's `symbol` or `decimals`, the token is now dropped from the discovery result and a warning is logged. This applies both to the aggregator's merged view and to standalone discovery services.
