---
"@wonderland/interop-cross-chain": patch
---

Fix LiFi Intents `Open` event ABI mismatch in `LifiOpenedIntentParser`

-   `maxSpent` is now decoded as `uint256[2][]` (token packed as uint256, then amount), matching the layout the LiFi solver actually emits on-chain. Previously typed as `tuple(address,uint256)[]`, which made `decodeEventLog` throw `AbiEventSignatureNotFoundError` and broke `getOrderStatus` / `watchOrder` for any user-open LiFi route.
-   `LIFI_OPEN_EVENT_SIGNATURE` is now derived from the ABI via `toEventSelector` instead of being hardcoded, so the topic check stays in sync with the ABI.
-   Added an anvil-fork integration test that runs the parser against a real Base tx and asserts orderId, user, origin chain, and fill instructions decode correctly.
