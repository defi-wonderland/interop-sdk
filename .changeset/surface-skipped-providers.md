---
"@wonderland/interop-cross-chain": minor
---

Surface providers skipped by asset discovery in `getQuotes` errors

`Aggregator.getQuotes` previously dropped a provider entirely when the discovery cache marked the requested input or output asset as unsupported — the provider appeared in neither `quotes` nor `errors`, making it indistinguishable from a flaky aggregation. Skipped providers now appear in `errors` with an `UnsupportedAsset` exception, `latencyMs: 0`, and the provider id, so UIs can label the reason instead of silently hiding the provider.
