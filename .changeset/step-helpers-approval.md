---
"@wonderland/interop-cross-chain": minor
---

Approvals are now tagged transactions instead of a separate step kind:

-   `TransactionStep` gains an optional `category: "approval"` field. The `ApprovalService` now prepends `TransactionStep`s with this tag instead of a dedicated `ApprovalStep` kind.
-   The `ApprovalStep` type and the `kind: "approval"` discriminant are removed.
-   `StepSchema` is now `discriminatedUnion("kind", [TransactionStepSchema, SignatureStepSchema])`.
-   `getTransactionSteps(order)` still returns every user-submittable on-chain step in emission order, but its return type is now `TransactionStep[]` (approvals included via `category`).
-   `isApprovalStep(step)` returns a plain `boolean`; checks `step.kind === "transaction" && step.category === "approval"`.
-   `getApprovalSteps(order)` returns `TransactionStep[]` filtered by `category === "approval"`.

Low-level approval internals are no longer re-exported from the package entrypoint:

-   `DefaultApprovalService`, `MulticallAllowanceReader`, `CreateApprovalServiceConfig`, and `AllowanceReadFailureHandler` are no longer part of `@wonderland/interop-cross-chain`. Use the `createApprovalService` factory and the `ExactAmountStrategy` / `InfiniteAmountStrategy` exports.

Migration:

-   Replace `step.kind === "approval"` with `isApprovalStep(step)` (or `step.kind === "transaction" && step.category === "approval"`).
-   Replace imports of `ApprovalStep` with `TransactionStep`.
-   Drop direct imports of `DefaultApprovalService` / `MulticallAllowanceReader` / `CreateApprovalServiceConfig` / `AllowanceReadFailureHandler`; build the service through `createApprovalService(config)`.
