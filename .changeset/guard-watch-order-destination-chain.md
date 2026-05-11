---
"@wonderland/interop-cross-chain": patch
---

`OrderTracker.watchOrder` now throws a typed `MissingDestinationChainId` from the entrypoint when `destinationChainId` is missing on the API tracking path, instead of letting the call surface as a confusing failure inside the fill watcher. The same error class also replaces the generic throw used by the on-chain path when a parsed intent has no destination chain in `fillInstructions`.
