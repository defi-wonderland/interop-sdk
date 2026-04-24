---
"@wonderland/interop-cross-chain": minor
---

Add buildQuote support for OIF provider

-   OIF provider now supports `buildQuote()` using the InputSettlerEscrow `open(StandardOrder)` function
-   Fill tracking uses on-chain `OutputFilled` events from the OutputSettler contract
-   Dual fill watcher: API-based for getQuotes flow, event-based for buildQuote flow (available to all providers via `onChainFillWatcherConfig`)
-   Fixed OIFOpenedIntentParser to parse the actual OIF `Open(bytes32, StandardOrder)` event instead of the ERC-7683 standard event
-   Removed dead code: unused ERC-7683 ABIs and types that didn't match the real OIF contracts
-   Shared `addressToBytes32` utility extracted from Across and OIF providers
