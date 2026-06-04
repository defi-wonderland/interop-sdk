---
"@wonderland/interop-cross-chain": minor
---

Require `QuoteRequest` when adapting OIF quotes

`adaptQuote` now takes `params: QuoteRequest` as a required argument (it was optional). The EIP-712 envelope of escrow/3009 orders is cross-checked against the user's quote request to detect tampering by a compromised solver, so omitting `params` from the public API was a footgun. Callers are now forced at compile time to supply the user's intent, making the tamper-check impossible to skip. `OifProvider.getQuotes` already passes `params`, so runtime behaviour is unchanged.
