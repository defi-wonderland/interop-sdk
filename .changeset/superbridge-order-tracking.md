---
"@wonderland/interop-cross-chain": minor
---

Add Superbridge order tracking

Wire `SuperbridgeProvider.getTrackingConfig` on top of the `/v1/activity` and `/v1/index_transaction` endpoints. Tracking uses the API-based opened-intent parser and fill watcher (`adaptOpenedIntentResponse`, `extractFillEvent`), with `/v1/index_transaction` as the pre-tracker. Adds unit tests on the activity and opened-intent adapters.
