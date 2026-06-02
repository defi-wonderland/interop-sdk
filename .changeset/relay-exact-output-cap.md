---
"@wonderland/interop-cross-chain": patch
---

Relay exact-output quotes now fail closed when the response omits the quoted input amount (`details.currencyIn.amount`). Previously the EIP-712 max-spend cap could be left undefined and skipped during signature envelope validation.
