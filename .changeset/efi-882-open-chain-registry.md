---
"@wonderland/interop-cross-chain": minor
---

Fix the silent allowance-read failure for chains outside the curated allowlist (EFI-882).

The chain registry is now open by default. `getChainById` resolves any chain viem knows (mainnet included); it only throws when viem itself has no record of the chain ID. `MulticallAllowanceReader` no longer swallows registry or RPC failures. A new optional `onReadFailure` callback receives `{ chainId, reason, error }` whenever a full chain batch fails, with `reason` separating registry misses (`"unknown-chain"`) from RPC or multicall errors (`"multicall"`). Single probe reverts still come back as `null` per entry and do not trigger the callback.

`CreateApprovalServiceConfig` exposes the same `onReadFailure` hook. It defaults to `console.warn` so bad configuration is visible. Pass `() => {}` to silence it. The new `ApprovalReadFailure` type is exported.

`SupportedChainIdSchema` is no longer a curated `z.union`. It is an alias of the internal `chainIdSchema` (positive safe integer), so the validation rules live in one place. Bridging support is decided by the registered providers at runtime through asset discovery, not by a schema or a shared constant. `SUPPORTED_CHAINS` is still exported as a convenient default for UI pickers.
