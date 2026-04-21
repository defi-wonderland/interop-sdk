---
"@wonderland/interop-cross-chain": minor
---

Fix silent allowance-read failure for chains outside the curated allowlist (EFI-882):

-   `getChainById` now resolves against the full `viem/chains` catalogue via `extractChain`, so any chain viem knows (including Ethereum mainnet) works out of the box — no SDK release required to add support. It still throws for chain IDs viem does not know.
-   `MulticallAllowanceReader` no longer swallows registry/RPC failures as a silent no-op. It accepts an optional `onReadFailure` callback that fires with `{ chainId, reason, error }` when an entire chain batch fails, distinguishing registry misses (`reason: "unknown-chain"`) from RPC/multicall rejections (`reason: "multicall"`). Individual on-chain probe reverts still surface as `null` allowances per entry without triggering the callback.
-   `CreateApprovalServiceConfig` gains an optional `onReadFailure` field. Default behavior is a `console.warn` with the `[ApprovalService]` prefix so misconfigurations are loud by default. Pass `() => {}` to silence.
-   New exported type: `ApprovalReadFailure`.
-   `SupportedChainIdSchema` is relaxed from a curated `z.union` to `z.number().int().positive()`. Whether a chain is actually supported for bridging is decided by the registered providers at runtime via asset discovery, not by a shared constant.
-   `SUPPORTED_CHAINS` remains exported for UI chain-picker defaults, but is no longer the authoritative source of bridging support.
