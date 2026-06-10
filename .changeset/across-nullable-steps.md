---
"@wonderland/interop-cross-chain": patch
---

Accept explicit `null` in Across `/swap/approval` responses for `steps.originSwap`, `steps.destinationSwap` and `approvalTxns`. The Across API now serializes absent steps as `null` instead of omitting them, which broke quote parsing for every route.
