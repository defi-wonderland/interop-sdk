---
"@wonderland/interop-cross-chain": minor
---

Validate quote-supplied allowance checks against the quote's own intent before approving

The approval service built `approve(spender, amount)` from the `owner`, `spender`, and `tokenAddress` carried in a quote, so a forged quote could make the connected wallet approve an arbitrary spender on an arbitrary token — and `preferInfinite` raised the granted amount to `maxUint256`. A new `ApprovalValidator` now keeps only the checks that match the quote: the token and owner must match a previewed input, the spender must be canonical Permit2 or the `to` of one of the quote's own transaction steps, and the required amount cannot exceed the input (`preferInfinite` is honoured only for Permit2). Dropped checks are reported through the validation failure handler and never produce an approval step.
