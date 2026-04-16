---
"@wonderland/interop-addresses": patch
---

Republish to unblock the release pipeline. The previous release did not bump `addresses`, so the publish job failed trying to re-publish 0.5.1 to npm.
