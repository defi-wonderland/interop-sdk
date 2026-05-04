---
"@wonderland/interop-cross-chain": minor
---

Add `Quote.fallbackToken` so callers can tell whether a route is atomic.

When the field is absent, the quote is atomic: the user receives exactly
`preview.outputs` or nothing. When present, a step after the bridge fill may
revert and the user is left holding the token described by the field
(`chainId`, `accountAddress`, `assetAddress`, `amount`).

Wired up for the Across and Relay providers.
