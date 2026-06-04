---
"@wonderland/interop-cross-chain": minor
---

Bind Bungee approval checks to the quote request and route

Bungee allowance checks were built from the solver's `approvalData`, copying `spenderAddress`, `tokenAddress` and `userAddress` straight into `order.checks.allowances`, which the SDK later turns into `approve()` transactions. A tampered response could set the spender to any address and have the user approve an attacker contract. The allowance spender is now taken from the route (canonical Permit2 for sign routes, the transaction target for tx and manual routes), and the token and owner come from the quote request instead of `approvalData`. Native input assets no longer produce an allowance. `adaptManualRouteQuote` now requires the `QuoteRequest`.
