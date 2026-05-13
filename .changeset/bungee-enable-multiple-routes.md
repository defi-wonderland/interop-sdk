---
"@wonderland/interop-cross-chain": minor
---

Add `enableMultipleRoutes` to the Bungee provider config.

When set to `true`, Bungee returns several route alternatives per quote
request (for example one optimised for the highest output, another for the
fastest fill) and the SDK emits one `Quote` per alternative. Defaults to
`false`, which keeps a single recommended route per request.

This replaces the previous behaviour, which always asked Bungee for multiple
routes — opt back in by setting `enableMultipleRoutes: true`. The option is
named generically so other providers with a similar concept can adopt it.
