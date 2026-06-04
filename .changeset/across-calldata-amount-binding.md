---
"@wonderland/interop-cross-chain": patch
---

Bind Across calldata amounts to the quote response fields

`AcrossProvider.validateCalldata` now checks the decoded `swapTx.data` `inputAmount` and `outputAmount` against the response's `inputAmount` and `minOutputAmount`, not only against the request. This ties the amounts previewed to the user to the amounts encoded in the deposit calldata, and it covers `exact-output` quotes where the request has no `input.amount` and the calldata `inputAmount` was previously left unchecked.
