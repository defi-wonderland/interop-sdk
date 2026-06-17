---
"@wonderland/interop-cross-chain": minor
---

Implement Superbridge getQuotes for the user-transaction route

Add the quote adapters (`quoteRequestAdapter`, `quoteResponseAdapter`) that map an SDK `QuoteRequest` to a Superbridge `/v1/routes` request and the response back to `Quote[]`, filtering routes to the canonical native bridges and keeping only the quotes whose initiating transaction matches an enabled submission mode. `SuperbridgeProvider.getQuotes` now wires both adapters and wraps failures in `ProviderGetQuoteFailure`. Submission and tracking still throw until later issues.
