---
"@wonderland/interop-cross-chain": patch
---

Fix `OrderTracker` breaking browser bundles. Replace the Node `EventEmitter` base with an in-repo `TypedEventEmitter` so importing `@wonderland/interop-cross-chain` no longer requires a `node:events` polyfill under Vite, Webpack, Rolldown, or any browser-targeting bundler. Public API (`on` / `once` / `off` / `emit`) is unchanged.
