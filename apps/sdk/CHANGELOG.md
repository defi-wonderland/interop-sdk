# @wonderland/interop

## 0.4.0

### Minor Changes

-   59afd29: Move `viem` from a direct dependency to a peer dependency (`^2.28.0`). Consumers must now install `viem` alongside these packages. This avoids duplicate viem installs and lets apps control the exact `viem` version. The `@wonderland/interop` facade propagates the same peer requirement.

### Patch Changes

-   Updated dependencies [522cd53]
-   Updated dependencies [08b637d]
-   Updated dependencies [eec04ae]
-   Updated dependencies [eec04ae]
-   Updated dependencies [59afd29]
-   Updated dependencies [59afd29]
    -   @wonderland/interop-cross-chain@0.7.0
    -   @wonderland/interop-addresses@0.6.0

## 0.3.5

### Patch Changes

-   Updated dependencies [da0cf09]
    -   @wonderland/interop-addresses@0.5.2
    -   @wonderland/interop-cross-chain@0.6.1

## 0.3.4

### Patch Changes

-   Updated dependencies [7f7db50]
-   Updated dependencies [b6be559]
-   Updated dependencies [01310c7]
-   Updated dependencies [c352336]
-   Updated dependencies [8204784]
-   Updated dependencies [c072a01]
-   Updated dependencies [9d639c9]
-   Updated dependencies [9a8ee1e]
    -   @wonderland/interop-cross-chain@0.6.0

## 0.3.3

### Patch Changes

-   Updated dependencies [bfcbd52]
-   Updated dependencies [a716e73]
-   Updated dependencies [c0d48a3]
-   Updated dependencies [ff33005]
-   Updated dependencies [02ca558]
-   Updated dependencies [26ce60c]
    -   @wonderland/interop-cross-chain@0.5.0
    -   @wonderland/interop-addresses@0.5.1

## 0.3.2

### Patch Changes

-   Updated dependencies [5a43e97]
-   Updated dependencies [09c4643]
-   Updated dependencies [52beefd]
-   Updated dependencies [0f626e7]
-   Updated dependencies [8119d95]
-   Updated dependencies [675faa4]
-   Updated dependencies [bb008d6]
-   Updated dependencies [ac0ef0a]
-   Updated dependencies [0573276]
-   Updated dependencies [c594d16]
-   Updated dependencies [22f1bae]
-   Updated dependencies [6d4ffd4]
-   Updated dependencies [f944923]
-   Updated dependencies [c92d713]
-   Updated dependencies [7db71c1]
-   Updated dependencies [9a0415c]
    -   @wonderland/interop-cross-chain@0.4.0
    -   @wonderland/interop-addresses@0.5.0

## 0.3.1

### Patch Changes

-   Updated dependencies
    -   @wonderland/interop-addresses@0.4.0
    -   @wonderland/interop-cross-chain@0.3.0

## 0.3.0

### Minor Changes

-   5185c3d: Refactor `addresses` to two-layer architecture (Address/Name) aligned with latest EIP-7930, CAIP-350, and ERC-7828. Rename APIs (humanReadableToBinary → nameToBinary, parseHumanReadableName -> parseName), add synchronous encodeAddress, align terminology (chainNamespace → chainType).

### Patch Changes

-   Updated dependencies [7da2a86]
-   Updated dependencies [5185c3d]
    -   @wonderland/interop-cross-chain@0.2.2
    -   @wonderland/interop-addresses@0.3.0

## 0.2.1

### Minor Changes

-   f9050e5: feat: cross chain default sorting strategy
-   ba33ce0: feat: intent validator scaffolding

### Patch Changes

-   0652fb1: fix: chain namespace is required if the chain identifier is an integer
-   d55b308: make formatAddress synchronous (remove ENS option which is unused in the package)
-   1f38de8: fix: error display when ENS request fails
-   Updated dependencies [0652fb1]
-   Updated dependencies [d55b308]
    -   @wonderland/interop-addresses@0.2.1
    -   @wonderland/interop-cross-chain@0.2.1

## 0.2.0

### Minor Changes

-   Implement OIF Provider for custom connection to the SDK
    Refactor on Executor integration
    Improvements on addresses validations

### Patch Changes

-   00d4ba2: improve eip155 address validation
-   bd26c1f: fix: build with optional fields, remove viem chain validation
-   Updated dependencies [00d4ba2]
-   Updated dependencies [bd26c1f]
-   Updated dependencies
    -   @wonderland/interop-addresses@0.2.0
    -   @wonderland/interop-cross-chain@0.2.0

## 0.1.1

### Patch Changes

-   Updated dependencies [52861e5]
    -   @wonderland/interop-addresses@0.1.1
    -   @wonderland/interop-cross-chain@0.1.1

## 0.1.0

### Minor Changes

-   feat: Release 0.1.0 - Updated addresses module with latest spec, implemented intent tracking system, established quote aggregator structure in cross-chain package, added optional checksum support

### Patch Changes

-   Updated dependencies
    -   @defi-wonderland/interop-addresses@0.1.0
    -   @defi-wonderland/interop-cross-chain@0.1.0

## 0.0.2

### Patch Changes

-   72e686e: implemented changeset
-   Updated dependencies [72e686e]
    -   @defi-wonderland/interop-cross-chain@0.0.2
    -   @defi-wonderland/interop-addresses@0.0.2
