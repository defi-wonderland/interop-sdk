---
"@wonderland/interop-cross-chain": minor
---

feat: replace onBeforeTracking hook with PreTracker interface

-   Add PreTracker interface and APIPreTracker implementation
-   Add PreTrackerFactory for config-driven pre-tracker creation
-   Add WatchOrderByOrderId.openTxHash field for order-id tracking path
-   Remove OnBeforeTracking callback type
