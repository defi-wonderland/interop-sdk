---
"@wonderland/interop-cross-chain": minor
---

Add Superbridge schemas and API service

Add `schemas.ts` mirroring the Superbridge HTTP API (routes, activity, gasless submission, tokens) and `SuperbridgeApiService`, a thin typed wrapper over `HttpClient` exposing `getRoutes`, `getActivity` and `submitGasless`. The `SuperbridgeProvider` now builds and holds the service. `getQuotes` and `getTrackingConfig` still throw `ProviderExecuteNotImplemented` until the adapters land.
