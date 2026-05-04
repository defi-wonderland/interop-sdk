---
"@wonderland/interop-cross-chain": minor
"@wonderland/interop-addresses": minor
---

Replace axios with native fetch for SES (LavaMoat) compatibility. axios cannot run under SES because `lockdown()` tamper-proofs the JavaScript intrinsics it patches at startup, which blocked any consumer running under SES (Ambire and MetaMask Snaps).

The SDK now uses a small `HttpClient` / `httpRequest` / `HttpError` wrapper around native `fetch`, with the same observable behavior: 4xx/5xx throw, timeouts via AbortController, JSON serialization, header merging.

Sources:

-   [MetaMask Snaps — axios + SES](https://docs.metamask.io/snaps/how-to/debug-a-snap/common-issues/)
-   [SES — Endo readme](https://www.npmjs.com/package/ses)
