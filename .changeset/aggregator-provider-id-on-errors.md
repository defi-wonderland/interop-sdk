---
"@wonderland/interop-cross-chain": patch
---

Surface the provider id on `GetQuotesError`. The aggregator now sets `providerId` on every entry it pushes into `GetQuotesResponse.errors`, so consumers can map an error back to the provider that produced it (timeouts, schema failures, network errors). Additive and optional (`providerId?: string`); existing consumers keep working unchanged.
