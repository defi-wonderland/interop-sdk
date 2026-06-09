---
"@wonderland/interop-cross-chain": minor
---

Add the Superbridge gasless submission mode

Implement `SuperbridgeProvider.submitOrder` for the signature-based (gasless) route: `adaptSubmitGaslessRequest` builds the `/v1/submit_gasless` body from the quote's signature-step metadata and the user's signature, and `adaptSubmitGaslessResponse` maps the response to a `SubmitOrderResponse` (failing when no transaction hash comes back). Gasless quotes are already emitted by `getQuotes` when `submissionModes` includes `"gasless"`. Adds unit tests on both submit adapters and the provider submit path.
