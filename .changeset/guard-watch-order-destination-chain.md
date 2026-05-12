---
"@wonderland/interop-cross-chain": patch
---

`OrderTracker.watchOrder` now fails fast with a typed `MissingDestinationChainId` when the destination chain id cannot be determined, instead of bubbling up from internals or throwing a plain `Error`. Both the API and on-chain paths use the same error so callers can handle the case once.
