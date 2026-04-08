# @wonderland/interop-cross-chain

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
