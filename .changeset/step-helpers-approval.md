---
"@wonderland/interop-cross-chain": minor
---

Add `approval` flag to `TransactionStep` and expose approval step helpers:

-   `TransactionStep.approval?: boolean` — optional flag set by `ApprovalService` to mark ERC-20 `approve` steps. Provider-originated steps never set this field.
-   `isApprovalStep(step)` — detect approval transaction steps via the `approval` flag.
-   `getApprovalSteps(order)` — return every approval transaction step in an order.
