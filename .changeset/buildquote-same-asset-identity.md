---
"@wonderland/interop-cross-chain": minor
---

Add an opt-in consumer-provided same-asset check to buildQuote.

`buildQuote` only builds same-asset transfers, and confirms the input and output really are the same asset before building. By default it infers this from discovery metadata: the two legs must agree on symbol and decimals and be listed by a common provider, instead of matching on symbol alone. Cross-token swaps continue through `getQuotes`, and `allowDangerousParameters` still bypasses the check.

That heuristic relies on third-party token metadata. Consumers who want an authoritative, offline source of truth can now inject one. `createSameAssetService({ assetId -> chainId -> address })` builds a `SameAssetService` from a consumer-owned map, passed to `createAggregator` as `sameAssetService`. When set, the same-asset check resolves both legs through it: the transfer is allowed only when both resolve to the same asset id, and is fail-closed (rejected with `DifferentAssetNotAllowed`) when either address is unknown. Addresses are normalized before comparison — case-insensitive, with native placeholders collapsed.

The SDK ships no token list and maintains none. The pairings are the consumer's to provide and keep up to date, or implement the `SameAssetService` interface to resolve against your own registry.
