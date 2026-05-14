---
"@wonderland/interop-cross-chain": patch
---

Clarify the `OpenedIntentParser` interface JSDoc and the OIF constants header comment: on-chain event parsers (OIF, Across, LiFi Intents) return fully populated `OpenedIntent` fields, while API-based parsers (Relay, Bungee) return enough data to drive fill tracking and leave `maxSpent` / `minReceived` and some addresses as placeholders. No runtime behavior change.
