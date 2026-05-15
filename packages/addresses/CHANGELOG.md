# @wonderland/interop-addresses

## 0.8.0

### Minor Changes

-   891b0a7: Update direct dependencies to remove security vulnerabilities and migrate to the latest stable releases.

    -   `uuid` 13.0.0 → 14.0.0 in `@wonderland/interop-cross-chain` (patches the buffer-bounds advisory; only `v4` is used).
    -   `zod` 3.24.3 → 4.4.3. The public API surface keeps the same shape; internal schema sites were migrated to the v4 form: `z.string().url(...)` → `z.url(...)`, `z.record(value)` → `z.record(z.string(), value)`, and `.refine(check, dataFn)` → `.refine(check, { error: (issue) => ... })` for dynamic messages.
    -   `viem` (devDep) and `typescript` (devDep) bumped to 2.48.8 and 5.9.3. `peerDependencies.viem` moves to `^2.35.0`: `getEnsAddress.coinType` became `bigint` in 2.35, so the old `^2.28.0` range would have produced a type error for consumers on 2.28.x–2.34.x.
    -   `ts-to-zod` (cross-chain devDep) bumped to 5.1.0 to align with zod 4.

## 0.7.0

### Minor Changes

-   2a9154e: Replace axios with native fetch for SES (LavaMoat) compatibility. axios cannot run under SES because `lockdown()` tamper-proofs the JavaScript intrinsics it patches at startup, which blocked any consumer running under SES (Ambire and MetaMask Snaps).

    The SDK now uses a small `HttpClient` / `httpRequest` / `HttpError` wrapper around native `fetch`, with the same observable behavior: 4xx/5xx throw, timeouts via AbortController, JSON serialization, header merging.

    Sources:

    -   [MetaMask Snaps — axios + SES](https://docs.metamask.io/snaps/how-to/debug-a-snap/common-issues/)
    -   [SES — Endo readme](https://www.npmjs.com/package/ses)

## 0.6.0

### Minor Changes

-   59afd29: Move `viem` from a direct dependency to a peer dependency (`^2.28.0`). Consumers must now install `viem` alongside these packages. This avoids duplicate viem installs and lets apps control the exact `viem` version. The `@wonderland/interop` facade propagates the same peer requirement.

## 0.5.2

### Patch Changes

-   da0cf09: Republish to unblock the release pipeline. The previous release did not bump `addresses`, so the publish job failed trying to re-publish 0.5.1 to npm.

## 0.5.1

### Patch Changes

-   a716e73: Export error classes and missing functions (`resolveAddress`, `resolveChain`, `isValidChain`, `isValidChainType`) from the public API

## 0.5.0

### Minor Changes

-   09c4643: Add bip122 (Bitcoin) address support.
-   0f626e7: Add starknet address support.
-   675faa4: Widen `toChainIdentifier` and `fromChainIdentifier` to accept string chain references, enabling non-EVM chains like bip122 and starknet.
-   ac0ef0a: Add `getRegisteredChains` to fetch chains from the on.eth ChainResolver contract. Returns CAIP-2 chain type and reference strings instead of numeric chain IDs.
-   0573276: feat: enable onchain chain registry (on.eth) by default

    -   Replace `useExperimentalChainRegistry` with `onchainRegistry`, `offchainRegistryFallback`, and `rpcUrl` options
    -   Onchain resolution via `on.eth` is now the default when parsing chain labels
    -   Add default public RPC endpoint so onchain resolution works without configuration
    -   Offchain chainid.network registry used as automatic fallback
    -   Fully-qualified CAIP-2 identifiers (e.g., `eip155:10`) always work regardless of registry settings

### Patch Changes

-   bb008d6: Remove defunct cloudflare-eth.com RPC fallback in resolveChainFromRegistry, letting viem use its default public RPC endpoint instead

## 0.4.0

### Minor Changes

-   eacacee: Implement CAIP-350 for chain ID and interop addresses ERC-7930 (#161)
-   5befe5b: Add experimental onchain chain registry support via cid.eth (#157)
-   00d4c68: Faster ENS resolution with custom RPCs (#131)

## 0.3.0

### Minor Changes

-   5185c3d: Refactor to two-layer architecture (Address/Name) aligned with latest EIP-7930, CAIP-350, and ERC-7828. Rename APIs (humanReadableToBinary → nameToBinary, parseHumanReadableName -> parseName), add synchronous encodeAddress, align terminology (chainNamespace → chainType).

## 0.2.1

### Patch Changes

-   0652fb1: fix: chain namespace is required if the chain identifier is an integer
-   d55b308: make formatAddress synchronous (remove ENS option which is unused in the package)
-   1f38de8: fix: error display when ENS request fails

## 0.2.0

### Minor Changes

-   Implement OIF Provider for custom connection to the SDK
    Refactor on Executor integration
    Improvements on addresses validations

### Patch Changes

-   00d4ba2: improve eip155 address validation
-   bd26c1f: fix: build with optional fields, remove viem chain validation

## 0.1.1

### Patch Changes

-   52861e5: ENS resolution now falls back to mainnet address when chain-specific ENS records are not found

## 0.1.0

### Minor Changes

-   feat: Release 0.1.0 - Updated addresses module with latest spec, implemented intent tracking system, established quote aggregator structure in cross-chain package, added optional checksum support

## 0.0.2

### Patch Changes

-   72e686e: implemented changeset
