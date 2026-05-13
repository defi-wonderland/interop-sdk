---
"@wonderland/interop-cross-chain": patch
---

Fix `FetchHttpClient` dropping the path prefix of `baseURL` when the request path starts with `/`. The `URL` constructor treats leading-slash paths as absolute and discards the base path, so callers that point at a proxy or gateway (e.g. `https://proxy.example.com/relay-api/`) saw their requests hit the wrong endpoint and returned 404. `buildUrl` now normalizes `baseURL` to end with `/` and strips the leading `/` from the path before resolving.
