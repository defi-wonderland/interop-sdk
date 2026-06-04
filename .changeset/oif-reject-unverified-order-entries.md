---
"@wonderland/interop-cross-chain": minor
---

Reject OIF orders that carry unverified extra entries

OIF order validation only checks `inputs[0]`, so any extra entry in an order's `permitted`, `commitments`, or `allowances` array went through unverified — a solver could use that to slip in transfers the SDK never cross-checked against the user's intent. Escrow, resource-lock, and user-open orders with more than one such entry are now rejected, and `oif-user-open-v0` throws the new `UnverifiedOrderEntries` error in that case.
