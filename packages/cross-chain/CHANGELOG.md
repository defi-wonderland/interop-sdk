# @wonderland/interop-cross-chain

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
