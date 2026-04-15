---
"@wonderland/interop-cross-chain": minor
---

Add optional `ApprovalService` that enriches `ExecutableQuote`s with ERC-20 `TransactionStep` approvals when the on-chain allowance is insufficient. Ships with `ExactAmountStrategy` (default) and `InfiniteAmountStrategy` to control how much is approved.
