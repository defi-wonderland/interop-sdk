# @defi-wonderland/interop-addresses

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
