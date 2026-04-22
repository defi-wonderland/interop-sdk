---
"@wonderland/interop-cross-chain": minor
---

Add a dedicated `approval` step kind and expose approval step helpers:

-   New `ApprovalStep` (`kind: "approval"`) in `Order.steps` with the same `transaction` payload as `TransactionStep`. The `ApprovalService` prepends steps of this kind instead of regular `TransactionStep`s.
-   `isApprovalStep(step)` — type-predicate narrowing `Step` to `ApprovalStep`.
-   `getApprovalSteps(order)` — return every approval step in an order.
-   `getTransactionSteps(order)` keeps its behaviour: returns every user-submittable on-chain step (both `transaction` and `approval` kinds, in emission order) so the standard "iterate and forget" execution loop still fires approvals before the transfer that needs them. Its return type is now `(TransactionStep | ApprovalStep)[]`.
-   `isTransactionOnlyOrder(order)` accepts orders whose steps mix `transaction` and `approval` kinds.
