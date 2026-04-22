---
"@wonderland/interop-cross-chain": minor
---

Open up the chain registry and surface allowance-read failures.

`getChainById` now resolves any chain viem knows and only throws when viem has no record of the chain ID.

`MulticallAllowanceReader` no longer swallows registry or RPC failures. It takes an optional `failureHandler` (`AllowanceReadFailureHandler`) that receives `{ chainId, reason, error }` when a full chain batch fails. `CreateApprovalServiceConfig` exposes the same hook and defaults to `console.warn`; pass `{ handle: () => {} }` to silence it. Only the `AllowanceReadFailureHandler` interface is exported — the failure payload and reason strings are reachable through inference from `handle(failure)`.

`SupportedChainIdSchema` is no longer a curated `z.union`; it is an alias of the internal `chainIdSchema` (positive safe integer). Bridging support is decided by the registered providers at runtime.
