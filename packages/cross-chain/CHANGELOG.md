# @wonderland/interop-cross-chain

## 0.13.2

### Patch Changes

-   78b5683: Relay exact-output quotes now fail closed when the response omits the quoted input amount (`details.currencyIn.amount`). Previously the EIP-712 max-spend cap could be left undefined and skipped during signature envelope validation.

## 0.13.1

### Patch Changes

-   9fe1343: Address release review findings across cross-chain providers. OIF escrow validation now rejects malformed witness outputs with `Eip712EnvelopeMismatch` instead of a raw `TypeError`. `createCrossChainProvider` no longer resolves prototype-chain keys like `toString`. Relay exact-input quotes keep the user's signed input amount as the envelope max-spend cap instead of using solver quote data. Bungee manual-route allowances now target the built transaction's chain instead of the quote origin chain.

## 0.13.0

### Minor Changes

-   4210551: Use a stable default `providerId` for Across

    `AcrossProvider`'s default `providerId` is now the stable `"across"` (matching `relay` and `bungee`), instead of an `across_<uuid>` value generated once at module load. Because the default is stable, adding two Across providers with default config to the same aggregator now resolves to the same id and throws `DuplicateProvider`; pass an explicit `providerId` to run several Across providers.

-   4210551: Throw `DuplicateProvider` on conflicting provider IDs

    `createAggregator` now throws the new `DuplicateProvider` error when two providers resolve to the same `providerId`, instead of silently overwriting one of them. Providers are indexed by a `Map`, so any string (including reserved object keys like `toString` or `__proto__`) is treated as an ordinary id.

-   4210551: Accept protocol name strings in `createAggregator` providers

    `createAggregator({ providers })` now accepts the optional-config protocol names `"across"`, `"relay"` and `"bungee"` alongside `CrossChainProvider` instances. Names are instantiated with default config via `createCrossChainProvider`, so `providers: ["across", "relay", "bungee"]` works without wiring each provider by hand. `oif` still requires an instance since its config is mandatory; `lifi-intents` also now works without config via the default order server URL.

-   5b22671: Add Bungee manual routes via `enableOtherProviders`

    -   `BungeeProvider` now accepts `enableOtherProviders?: boolean`. When set, `getQuotes` returns Bungee's auto routes plus a Quote per manual route — those served by other bridge protocols routed through Bungee.
    -   Each manual route is built eagerly via `GET /api/v1/bungee/build-tx` so quotes ship with an executable `TransactionStep`. Per-route build failures are isolated and do not abort the auto route or the rest of the manuals.
    -   Tracking is now split per flow so each polls Bungee with the right identifier:
        -   Auto routes set `tracking.orderId = requestHash` and the SDK polls `/status?requestHash=…` via `fillWatcherConfig`.
        -   Manual routes have no Bungee-issued requestHash, so the SDK polls `/status?txHash=${openTxHash}` via the new `onChainFillWatcherConfig` — no longer assuming the auto-route identifier shape works for manual flows.
    -   `openedIntentParserConfig.buildUrl` now queries `/status?txHash=…` (previously `?requestHash=…`) so the parameter matches the on-chain origin tx hash it receives.

-   6b40a3c: Wire EIP-712 envelope validation into the Bungee signature flow so tampered envelopes are rejected with `Eip712EnvelopeMismatch` before the wallet is prompted to sign.
-   ca3c27b: Wire the EIP-712 envelope validators into the OIF signature flow. The OIF order adapter now runs `validateOifEscrowSignatureEnvelope` or `validateOif3009SignatureEnvelope` before surfacing any EIP-712 signature step, so tampered envelopes are rejected with a typed `Eip712EnvelopeMismatch` before the wallet is prompted.

    The escrow path validates against the canonical Permit2 singleton, the batched `PermitBatchWitnessTransferFrom` primary type, and cross-checks the `witness.user` and the single `witness.outputs[0]` entry (`chainId`, `token`, `recipient`, `amount`) against the user's quote request — a malicious solver can no longer keep the permit fields intact while redirecting the destination output. The EIP-3009 path validates the typed-data domain (which is the token contract itself by definition) against the user's input asset and cross-checks `from`, `to`, and `value`.

-   150199a: Default the LiFi Intents `orderServerUrl` to the official endpoint (`https://order.li.fi`). `createCrossChainProvider("lifi-intents")` and `createAggregator({ providers: ["lifi-intents"] })` now work without config; pass `orderServerUrl` to override (e.g. `LIFI_INTENTS_ORDER_SERVER_DEV_URL`). Invalid URLs are still rejected.

### Patch Changes

-   1079638: Surface the provider id on `GetQuotesError`. The aggregator now sets `providerId` on every entry it pushes into `GetQuotesResponse.errors`, so consumers can map an error back to the provider that produced it (timeouts, schema failures, network errors). Additive and optional (`providerId?: string`); existing consumers keep working unchanged.
-   efa877c: Wire the EIP-712 envelope validators into the Relay signature flow. The Relay quote adapter now runs `validateRelaySignatureEnvelope` before surfacing any EIP-712 signature step, so tampered envelopes are rejected with a typed `Eip712EnvelopeMismatch` before the wallet is prompted.

    The validator dispatches by `primaryType` to the Permit2 or EIP-3009 path, enforces Relay-specific invariants (no native input asset, Permit2 domain without `version`, EIP-3009 domain with a non-empty `version`), and reads the recipient field from the envelope (`spender` for Permit2, `to` for EIP-3009) to assert it is a well-formed address and is not the user.

## 0.12.0

### Minor Changes

-   acb531e: Add reusable EIP-712 envelope validation utilities under `src/core`: `validatePrimaryType` and `validateEnvelopeDomain` for envelope-level checks, `validatePermit2Message` for Permit2 single and batch payloads, and `validateEip3009Message` for transfer/receive-with-authorization payloads. Mismatches throw a typed `Eip712EnvelopeMismatch`.

    The validators focus on the checks that actually carry security weight — `chainId` equality, `verifyingContract` allow-list, address equality for `from`/`to`/`spender`, amount caps via `toNonNegativeBigInt` (with a non-negative guard so a tampered envelope can't smuggle a negative entry under the cap), and deadline / `validAfter` freshness. Wire-format hardening for whitespace, alternative number bases, missing `domain.version`, native-asset placeholders, and similar shape errors is left to the caller's schema layer (Zod) and the on-chain signature check.

    These utilities are not wired into any protocol yet — Bungee, Relay, and OIF integration will follow in separate changes.

-   64803cb: Align `oif-escrow-v0` with the new OIF deployment.

    -   `PERMIT2_TYPES.Permit2Witness` now starts with `user` (address). Canonical type: `Permit2Witness(address user,uint32 expires,address inputOracle,MandateOutput[] outputs)`. `oifEscrowValidator` rejects quotes whose `payload.message.witness.user` is missing or does not match the requested user.
    -   `OIF_INPUT_SETTLER_ESCROW_BY_CHAIN` → `0x1CC9260E285C2C8AC8D2E7102F3978056Ec1d0a8` (Arbitrum, Base, Optimism).
    -   `OIF_OUTPUT_SETTLER_BY_CHAIN` → `0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10` (Arbitrum, Base, Optimism).

    Breaking: consumers caching the previous settler addresses or signing the 3-field witness must update — the new contracts reject the old digest.

### Patch Changes

-   3e100b8: Expose `SubmissionMode` (the `"user-transaction" | "gasless"` union) from the package entry point so consumers can type submission-mode preferences without duplicating the literal locally.
-   f384292: Lower `EventBasedFillWatcher` block range from 40,000 to 9,000.

    `arbitrum-one-rpc.publicnode.com` caps `eth_getLogs` at 10,000 blocks and rejected every poll with `exceed maximum block range`. The error was swallowed as "not filled yet", so on-chain tracking for orders destined to Arbitrum (e.g. OIF buildQuote) never detected the `OutputFilled` event and timed out as `Awaiting solver` even when the fill had already happened on-chain. 9,000 sits under every public RPC limit we use (publicnode-arbitrum: 10k, publicnode-base/optimism: 50k) and still gives ~37 min of detection window on Arbitrum, which is plenty for fresh fills.

## 0.11.0

### Minor Changes

-   65900e0: Add `enableMultipleRoutes` to the Bungee provider config.

    When set to `true`, Bungee returns several route alternatives per quote
    request (for example one optimised for the highest output, another for the
    fastest fill) and the SDK emits one `Quote` per alternative. Defaults to
    `false`, which keeps a single recommended route per request.

    This replaces the previous behaviour, which always asked Bungee for multiple
    routes — opt back in by setting `enableMultipleRoutes: true`. The option is
    named generically so other providers with a similar concept can adopt it.

-   867c918: Surface post-fee expected output and slippage floor on `Quote.preview.outputs` across providers.

    `QuotePreviewEntry` gains an optional `minAmount` field — the slippage floor guaranteed to the user after the provider's slippage tolerance is applied.

    Per-provider behavior:

    -   **Bungee** previously mapped `amount` (pre-fee optimistic) as the headline output. Wallets quoted that number and users saw less than promised once fees were deducted on fill. The adapter now uses `effectiveAmount ?? amount` for the headline (post-fee expected) with matching `effectiveValueInUsd ?? valueInUsd` for the USD value, and exposes `minAmountOut` as `minAmount`. Verified against a live Bungee quote (10 USDC Arbitrum → Base): pre-fee `amount` was 9.988676, `effectiveAmount` was 9.955638, `minAmountOut` was 9.954642. The headline now matches what the user actually receives.
    -   **Across** already mapped `expectedOutputAmount` (post-fee) for the headline. It now also exposes `minOutputAmount` as `minAmount`.
    -   **Relay** already mapped `currencyOut.amount` for the headline. It now also exposes `currencyOut.minimumAmount` as `minAmount`.

    Atomic intent providers (LiFi Intents, OIF) leave `minAmount` undefined and continue to set `amount` to the exact filled amount — there is no slippage in an atomic intent.

-   f04c1dc: Add `Quote.fallbackToken` so callers can tell whether a route is atomic.

    When the field is absent, the quote is atomic: the user receives exactly
    `preview.outputs` or nothing. When present, a step after the bridge fill may
    revert and the user is left holding the token described by the field
    (`chainId`, `accountAddress`, `assetAddress`, `amount`).

    Wired up for the Across and Relay providers.

    The Across response schema also gains optional fields (`crossSwapType`,
    `steps`, `approvalTxns`, `checks`, `refundToken`, `quoteExpiryTimestamp`
    and a richer `fees` shape) so it mirrors the OpenAPI spec at
    https://docs.across.to/api-reference/swap/approval/get and is easier to
    keep in sync going forward.

-   92851f3: Add `latencyMs` to `Quote` and `GetQuotesError` so callers can see how long each provider took to respond.
-   891b0a7: Update direct dependencies to remove security vulnerabilities and migrate to the latest stable releases.

    -   `uuid` 13.0.0 → 14.0.0 in `@wonderland/interop-cross-chain` (patches the buffer-bounds advisory; only `v4` is used).
    -   `zod` 3.24.3 → 4.4.3. The public API surface keeps the same shape; internal schema sites were migrated to the v4 form: `z.string().url(...)` → `z.url(...)`, `z.record(value)` → `z.record(z.string(), value)`, and `.refine(check, dataFn)` → `.refine(check, { error: (issue) => ... })` for dynamic messages.
    -   `viem` (devDep) and `typescript` (devDep) bumped to 2.48.8 and 5.9.3. `peerDependencies.viem` moves to `^2.35.0`: `getEnsAddress.coinType` became `bigint` in 2.35, so the old `^2.28.0` range would have produced a type error for consumers on 2.28.x–2.34.x.
    -   `ts-to-zod` (cross-chain devDep) bumped to 5.1.0 to align with zod 4.

### Patch Changes

-   f813669: Fix `FetchHttpClient` dropping the path prefix of `baseURL` when the request path starts with `/`. The `URL` constructor treats leading-slash paths as absolute and discards the base path, so callers that point at a proxy or gateway (e.g. `https://proxy.example.com/relay-api/`) saw their requests hit the wrong endpoint and returned 404. `buildUrl` now normalizes `baseURL` to end with `/` and strips the leading `/` from the path before resolving.
-   80e6613: `OrderTracker.watchOrder` now fails fast with a typed `MissingDestinationChainId` when the destination chain id cannot be determined, instead of bubbling up from internals or throwing a plain `Error`. Both the API and on-chain paths use the same error so callers can handle the case once.
-   47f423d: Clarify the `OpenedIntentParser` interface JSDoc and the OIF constants header comment: on-chain event parsers (OIF, Across, LiFi Intents) return fully populated `OpenedIntent` fields, while API-based parsers (Relay, Bungee) return enough data to drive fill tracking and leave `maxSpent` / `minReceived` and some addresses as placeholders. No runtime behavior change.
-   Updated dependencies [891b0a7]
    -   @wonderland/interop-addresses@0.8.0

## 0.10.0

### Minor Changes

-   755dc8c: Surface token `name` and `logoURI` on `DiscoveredAssetInfo`

    -   `AssetInfo` (and therefore `DiscoveredAssetInfo`) gains optional `name` and `logoURI` fields.
    -   Bungee, Across, LiFi Intents and Relay adapters now propagate every metadata field their endpoints actually return; `logoURI` is `undefined` for providers whose discovery endpoints don't include a logo (LiFi `/routes`, Relay `/chains`).
    -   `toDiscoveredAssets` and `mergeDiscoveredAssets` keep the first non-empty `name` / `logoURI` when the same token shows up under multiple providers, matching how `providers[]` is already merged.

-   c67fd48: Add explorer URLs to `OrderTrackingUpdate`

    -   `OrderTrackingUpdate` now has `explorers?: { tracker?, origin?, destination? }`, plus `originChainId` (required) and `destinationChainId`.
    -   `CrossChainProvider.getOrderExplorers(params)` returns chain block explorer URLs by default. Across and Bungee override it to also return their bridge tracker URL. LiFi Intents, OIF and Relay use the default until they have a public scanner.
    -   The `OrderTracker` calls the provider's resolver on every yielded update, so consumers read `update.explorers.tracker ?? update.explorers.origin` instead of building URLs themselves.

-   2a9154e: Replace axios with native fetch for SES (LavaMoat) compatibility. axios cannot run under SES because `lockdown()` tamper-proofs the JavaScript intrinsics it patches at startup, which blocked any consumer running under SES (Ambire and MetaMask Snaps).

    The SDK now uses a small `HttpClient` / `httpRequest` / `HttpError` wrapper around native `fetch`, with the same observable behavior: 4xx/5xx throw, timeouts via AbortController, JSON serialization, header merging.

    Sources:

    -   [MetaMask Snaps — axios + SES](https://docs.metamask.io/snaps/how-to/debug-a-snap/common-issues/)
    -   [SES — Endo readme](https://www.npmjs.com/package/ses)

### Patch Changes

-   8c38188: Fix LiFi Intents `Open` event ABI mismatch in `LifiOpenedIntentParser`

    -   `maxSpent` is now decoded as `uint256[2][]` (token packed as uint256, then amount), matching the layout the LiFi solver actually emits on-chain. Previously typed as `tuple(address,uint256)[]`, which made `decodeEventLog` throw `AbiEventSignatureNotFoundError` and broke `getOrderStatus` / `watchOrder` for any user-open LiFi route.
    -   `LIFI_OPEN_EVENT_SIGNATURE` is now derived from the ABI via `toEventSelector` instead of being hardcoded, so the topic check stays in sync with the ABI.
    -   Added an anvil-fork integration test that runs the parser against a real Base tx and asserts orderId, user, origin chain, and fill instructions decode correctly.

-   Updated dependencies [2a9154e]
    -   @wonderland/interop-addresses@0.7.0

## 0.9.0

### Minor Changes

-   2d95b83: Expose USD values on quote preview inputs and outputs

    -   `QuotePreviewEntrySchema` now includes an optional `amountUsd` decimal-string field, mirroring the convention of `QuoteFeeEntrySchema.amountUsd`.
    -   Relay adapter populates `amountUsd` from `details.currencyIn.amountUsd` and `details.currencyOut.amountUsd`.
    -   Bungee adapter populates `amountUsd` from `result.input.valueInUsd` and `autoRoute.output.valueInUsd`.

-   ca022d4: Add buildQuote support for OIF provider

    -   OIF provider now supports `buildQuote()` using the InputSettlerEscrow `open(StandardOrder)` function
    -   Fill tracking uses on-chain `OutputFilled` events from the OutputSettler contract
    -   Dual fill watcher: API-based for getQuotes flow, event-based for buildQuote flow (available to all providers via `onChainFillWatcherConfig`)
    -   Fixed OIFOpenedIntentParser to parse the actual OIF `Open(bytes32, StandardOrder)` event instead of the ERC-7683 standard event
    -   Removed dead code: unused ERC-7683 ABIs and types that didn't match the real OIF contracts
    -   Shared `addressToBytes32` utility extracted from Across and OIF providers

-   518b2d9: Approvals are now tagged transactions instead of a separate step kind:

    -   `TransactionStep` gains an optional `category: "approval"` field. The `ApprovalService` now prepends `TransactionStep`s with this tag instead of a dedicated `ApprovalStep` kind.
    -   The `ApprovalStep` type and the `kind: "approval"` discriminant are removed.
    -   `StepSchema` is now `discriminatedUnion("kind", [TransactionStepSchema, SignatureStepSchema])`.
    -   `getTransactionSteps(order)` still returns every user-submittable on-chain step in emission order, but its return type is now `TransactionStep[]` (approvals included via `category`).
    -   `isApprovalStep(step)` returns a plain `boolean`; checks `step.kind === "transaction" && step.category === "approval"`.
    -   `getApprovalSteps(order)` returns `TransactionStep[]` filtered by `category === "approval"`.

    Low-level approval internals are no longer re-exported from the package entrypoint:

    -   `DefaultApprovalService`, `MulticallAllowanceReader`, `CreateApprovalServiceConfig`, and `AllowanceReadFailureHandler` are no longer part of `@wonderland/interop-cross-chain`. Use the `createApprovalService` factory and the `ExactAmountStrategy` / `InfiniteAmountStrategy` exports.

    Migration:

    -   Replace `step.kind === "approval"` with `isApprovalStep(step)` (or `step.kind === "transaction" && step.category === "approval"`).
    -   Replace imports of `ApprovalStep` with `TransactionStep`.
    -   Drop direct imports of `DefaultApprovalService` / `MulticallAllowanceReader` / `CreateApprovalServiceConfig` / `AllowanceReadFailureHandler`; build the service through `createApprovalService(config)`.

### Patch Changes

-   c4513b9: Gate `oif-resource-lock-v0` at the SDK entry points until support is finalized. The OIF request adapter no longer requests it from solvers, and the payload validator throws if a solver returns one.
-   be18f27: The OIF adapter now surfaces Permit2 allowances for `oif-escrow-v0` quotes. The EIP-712 payload is parsed and a `checks.allowances` entry is added pointing at the canonical Permit2 address, so the approval service prepends the required `approve(PERMIT2, ...)` automatically instead of the first transfer silently failing. All four Permit2 primaryTypes are handled; anything else is ignored with a warning.

    If your app accepts Permit2-based gasless flows, pair the approval service with `InfiniteAmountStrategy`. Permit2 consumes the ERC-20 allowance on every pull, so approving only the exact amount forces another approve before each order.

## 0.8.0

### Minor Changes

-   30b0347: Open up the chain registry and surface allowance-read failures.

    `getChainById` now resolves any chain viem knows and only throws when viem has no record of the chain ID.

    `MulticallAllowanceReader` no longer swallows registry or RPC failures. It takes an optional `failureHandler` (`AllowanceReadFailureHandler`) that receives `{ chainId, reason, error }` when a full chain batch fails. `CreateApprovalServiceConfig` exposes the same hook and defaults to `console.warn`; pass `{ handle: () => {} }` to silence it. Only the `AllowanceReadFailureHandler` interface is exported — the failure payload and reason strings are reachable through inference from `handle(failure)`.

    `SupportedChainIdSchema` is no longer a curated `z.union`; it is an alias of the internal `chainIdSchema` (positive safe integer). Bridging support is decided by the registered providers at runtime.

## 0.7.0

### Minor Changes

-   522cd53: Clean up `cross-chain` public type surface (EFI-880):

    -   Re-export `GetQuotesError` and `GetQuotesResponse` from the package entrypoint so consumers can name the return type of `Aggregator.getQuotes`.
    -   Narrow `createCrossChainProvider` to `SupportedProtocols`. The factory now has two overloads (one for protocols whose config is required, one for protocols whose config is optional) plus a generic implementation, and does an exhaustiveness check on the protocol name. Unknown protocol strings are now a compile error instead of a runtime throw.
    -   Drop the `StepResult[]` variant from `Aggregator.submitOrder`. The signature is now `submitOrder(quote, signature: Hex)`. No provider currently produces multi-step signature orders, so this variant was untested surface area. Callers passing a `StepResult[]` should extract the signature themselves before calling. The `StepResult` interface itself has also been removed — with no producers or consumers and no API point referencing it, it was speculative scaffolding. It can be reintroduced alongside a concrete multi-sig flow if one lands.
    -   Remove the unused token constants from `core/constants/tokens.ts`: `MAINNET_SUPPORTED_TOKEN_BY_CHAIN_ID`, `TESTNET_SUPPORTED_TOKEN_BY_CHAIN_ID`, `SUPPORTED_TOKEN_BY_CHAIN_ID`, `MAINNET_TOKEN_INFO`, and `TESTNET_TOKEN_INFO`. These were partial bootstrap lists with no in-repo consumers and implied authority they didn't have. For a runtime-accurate view of supported tokens per configuration, use `aggregator.discoverAssets()`. The `TokenInfo` type remains exported.

-   59afd29: Move `viem` from a direct dependency to a peer dependency (`^2.28.0`). Consumers must now install `viem` alongside these packages. This avoids duplicate viem installs and lets apps control the exact `viem` version. The `@wonderland/interop` facade propagates the same peer requirement.

### Patch Changes

-   08b637d: Fix `OrderTracker` breaking browser bundles. Replace the Node `EventEmitter` base with an in-repo `TypedEventEmitter` so importing `@wonderland/interop-cross-chain` no longer requires a `node:events` polyfill under Vite, Webpack, Rolldown, or any browser-targeting bundler. Public API (`on` / `once` / `off` / `emit`) is unchanged.
-   eec04ae: Normalize native token placeholders to the canonical `NATIVE_ASSET_ADDRESS` (EIP-7528 `0xEEE…E`) across discovery, routing, validation, and asset-support lookups, deduplicating ETH in `DiscoveredAssets` when providers report different sentinels (Bungee: `0xEEE…E`, Across/Relay/LI.FI Intents/OIF: `0x000…0`). Each provider's quote-request adapter translates the canonical address to the placeholder its API expects, so callers can pass either variant without breaking any provider. Adds the public `toCanonicalNativeAddress` helper.
-   eec04ae: Export `NATIVE_ASSET_ADDRESS` constant (EIP-7528 canonical native sentinel address)
-   59afd29: Remove unused `@across-protocol/app-sdk` dependency. The Across provider talks to the API directly via axios; the SDK was only referenced by a dead test mock, which has been deleted.
-   Updated dependencies [59afd29]
    -   @wonderland/interop-addresses@0.6.0

## 0.6.1

### Patch Changes

-   Updated dependencies [da0cf09]
    -   @wonderland/interop-addresses@0.5.2

## 0.6.0

### Minor Changes

-   7f7db50: Add optional warnings field to FillEvent, OrderTrackingUpdate and OrderTrackingInfo; Across fills now surface destination call failures through it
-   b6be559: Add Bungee cross-chain provider with permit2 signature and onchain transaction flows, API-based tracking, and token discovery.
-   01310c7: Add optional `ApprovalService` that enriches `ExecutableQuote`s with ERC-20 `TransactionStep` approvals when the on-chain allowance is insufficient. Ships with `ExactAmountStrategy` (default) and `InfiniteAmountStrategy` to control how much is approved.

### Patch Changes

-   c352336: Bungee provider returns an empty array when no routes are available instead of throwing.
-   8204784: Fix Across native token handling: normalize native addresses (0x0...0, 0xEeee...eE) to WETH in SpokePool calldata
-   c072a01: Remove 4xx special-casing in LI.FI Intents provider for uniform error handling
-   9d639c9: Wrap raw errors in ProviderGetQuoteFailure in Relay provider collectQuotes
-   9a8ee1e: Restrict RelayPostBodySchema.api to valid enum values matching the submit schema

## 0.5.0

### Minor Changes

-   c0d48a3: Fix LI.FI Intents order tracking with custom Open event parser, correct order status schema, handle 4xx as empty quotes, remove unused constants and exports
-   ff33005: Add permit-based (gasless) transfer support for the Relay provider via EIP-712 signatures
-   02ca558: Restrict buildQuote to same-asset cross-chain transfers only. Same-chain intents are now rejected with `SameChainIntentNotAllowed`. When input and output tokens differ, a `DifferentAssetNotAllowed` error is thrown directing users to `getQuotes()` for cross-token swaps. Cross-chain transfers with unavailable token metadata are also blocked unless `allowDangerousParameters` is set.

### Patch Changes

-   bfcbd52: Add Optimism SpokePool address to Across constants for buildQuote support on OP.
-   26ce60c: Add asset-support validation to `buildQuote()` — rejects unsupported token routes before calling the provider
-   Updated dependencies [a716e73]
    -   @wonderland/interop-addresses@0.5.1

## 0.4.0

### Minor Changes

-   52beefd: feat: add LI.FI Intents cross-chain provider

    Add LifiIntentsProvider integrating the LI.FI Intents solver marketplace:

    -   Full CrossChainProvider implementation (getQuotes, getTrackingConfig, getDiscoveryConfig)
    -   Adapters for quote request/response and order status mapping
    -   LifiIntentsAssetDiscoveryService with caching and chain filtering
    -   Zod schemas for config, quotes, status, and routes
    -   Registered in crossChainProviderFactory as "lifi-intents"

-   8119d95: Add safety validations to `buildQuote()` to prevent zero amounts, insufficient fee margins, and invalid deadlines
-   c594d16: Refactor asset discovery to use plain addresses and numeric chain IDs

    -   `DiscoveredAssets.tokensByChain` now uses numeric chain ID keys (e.g. `1`) instead of CAIP-350 strings (e.g. `"eip155:1"`)
    -   `DiscoveredAssets.tokenMetadata` is now nested by chain ID then lowercase address to prevent cross-chain collisions
    -   `AssetInfo.address` uses plain `0x` format instead of EIP-7930 interop encoding
    -   `RouteQuery` now takes `originChainId`, `originAsset`, `destinationChainId`, `destinationAsset` (4 fields) instead of two EIP-7930 addresses
    -   Removed `encodeAddress`/`toChainIdentifier` dependencies from asset discovery pipeline
    -   Removed `toEVMInteropAddress` helper (no longer needed)

-   22f1bae: feat: add automatic token discovery for Relay bridge

    -   Add `getDiscoveryConfig()` to RelayProvider using GET `/chains` with `solverCurrencies`
    -   Static testnet tokens for Sepolia and Base Sepolia
    -   Full `RelayChainsResponseSchema` matching the OpenAPI spec

-   6d4ffd4: feat: replace onBeforeTracking hook with PreTracker interface

    -   Add PreTracker interface and APIPreTracker implementation
    -   Add PreTrackerFactory for config-driven pre-tracker creation
    -   Add WatchOrderByOrderId.openTxHash field for order-id tracking path
    -   Remove OnBeforeTracking callback type

-   f944923: feat: add Relay provider implementation

    -   RelayProvider with quote, status, and tracking support
    -   Layered architecture with solver notification decorator
    -   Granular Relay status mapping and fillTxHash extraction
    -   API-based intent parsing and deposit notification via indexTransaction

-   c92d713: feat: add Relay protocol types and schemas

    Add Zod schemas and TypeScript types for the Relay protocol:

    -   Quote request and response schemas aligned with Relay OpenAPI spec
    -   Intent status request schema
    -   Relay-specific types (fees, details, currency)

-   7db71c1: feat: standardize fees and allowances across providers

    -   Add `QuoteFeesSchema` to `QuoteSchema` with `bridgeFee`, `bridgeFeePct`, and `originGas`
    -   Populate `quote.fees` in Relay and Across adapters
    -   Extract Relay approve steps into `order.checks.allowances`
    -   Export `QuoteFeeEntry` and `QuoteFees` types

-   9a0415c: feat: add buildQuote for on-chain intent submission without a solver API

    -   Add `buildQuote` method to `CrossChainProvider` base class (opt-in, default throws)
    -   Implement `buildQuote` in `OifProvider` using ERC-7683 `open()` calldata encoding
    -   Implement `buildQuote` in `AcrossProvider` using `SpokePool.deposit()` calldata encoding
    -   Add `BuildQuoteRequest` schema with required amounts, escrow contract address, and fill deadline
    -   Expose `buildQuote` on the `Aggregator` for provider-routed local quote building

### Patch Changes

-   5a43e97: Fix Across provider to pass `value` from swapTx response for native ETH inputs, and remove same-symbol restriction since Across supports cross-chain swaps.
-   Updated dependencies [09c4643]
-   Updated dependencies [0f626e7]
-   Updated dependencies [675faa4]
-   Updated dependencies [bb008d6]
-   Updated dependencies [ac0ef0a]
-   Updated dependencies [0573276]
    -   @wonderland/interop-addresses@0.5.0

## 0.3.0

### Minor Changes

-   8969f6c: OIF provider full integration (#162)
-   e4a952f: Integrate OIF provider with asset discovery validation (#163)
-   f5924a4: Adapters for OIF typed data and gasless order lifecycle tracking (#158)
-   354c6c1: Add OIF asset discovery service (#143)
-   ba1d024: Across asset discovery (#156)
-   cc2d5ca: Native ETH bridge support (#170)
-   eacacee: Implement CAIP-350 for chain ID and interop addresses ERC-7930 (#161)
-   df5ecaf: API order tracking (#137)
-   f616315: Implement OIF payload validation for all order types (#130)
-   fb9a209: Mainnet/testnet switch support (#136)

### Patch Changes

-   0d2a4f1: Improve asset discovery services with permanent caching (#167)
-   e709abd: Cross chain demo feedback (#168)
-   a13a045: Docs findings and simplify provider instance (#142)
-   Updated dependencies [eacacee]
    -   @wonderland/interop-addresses@0.4.0

## 0.2.2

### Patch Changes

-   7da2a86: Validations for every supported across api return value. Decoding built data to prevent any malicious injection from the involved centralized servers.
-   Updated dependencies [5185c3d]
    -   @wonderland/interop-addresses@0.3.0

## 0.2.1

### Minor Changes

-   f9050e5: feat: cross chain default sorting strategy
-   ba33ce0: feat: intent validator scaffolding

### Patch Changes

-   Updated dependencies [0652fb1]
-   Updated dependencies [d55b308]
    -   @wonderland/interop-addresses@0.2.1

## 0.2.0

### Minor Changes

-   Implement OIF Provider for custom connection to the SDK
    Refactor on Executor integration
    Improvements on addresses validations

### Patch Changes

-   Updated dependencies [00d4ba2]
-   Updated dependencies [bd26c1f]
-   Updated dependencies
    -   @wonderland/interop-addresses@0.2.0

## 0.1.1

### Patch Changes

-   Updated dependencies [52861e5]
    -   @wonderland/interop-addresses@0.1.1

## 0.1.0

### Minor Changes

-   feat: Release 0.1.0 - Updated addresses module with latest spec, implemented intent tracking system, established quote aggregator structure in cross-chain package, added optional checksum support

### Patch Changes

-   Updated dependencies
    -   @defi-wonderland/interop-addresses@0.1.0

## 0.0.2

### Patch Changes

-   72e686e: implemented changeset
-   Updated dependencies [72e686e]
    -   @defi-wonderland/interop-addresses@0.0.2
