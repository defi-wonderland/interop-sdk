---
"@wonderland/interop-cross-chain": minor
---

Add explorer URLs to `OrderTrackingUpdate`

-   `OrderTrackingUpdate` now has `explorers?: { tracker?, origin?, destination? }`, plus `originChainId` (required) and `destinationChainId`.
-   `CrossChainProvider.getOrderExplorers(params)` returns chain block explorer URLs by default. Across and Bungee override it to also return their bridge tracker URL. LiFi Intents, OIF and Relay use the default until they have a public scanner.
-   The `OrderTracker` calls the provider's resolver on every yielded update, so consumers read `update.explorers.tracker ?? update.explorers.origin` instead of building URLs themselves.
