# @wonderland/interop-addresses

A TypeScript library for handling interoperable blockchain addresses across different networks.

This package provides methods to convert between human-readable addresses and their binary string representation, both following the [ERC-7930](https://ethereum-magicians.org/t/erc-7930-interoperable-addresses/23365) and [ERC-7828](https://ethereum-magicians.org/t/erc-7828-chain-specific-addresses-using-ens/21930) standards. For backward compatibility with existing smart contracts, the package includes utilities to extract individual components (chainId and address) from the binary representation, allowing seamless integration with systems that haven't yet adopted the interop address format.

## Installation

```
pnpm add @wonderland/interop-addresses
```

## Usage

```typescript
// Using the Provider
// Or just importing the method
import { humanReadableToBinary, InteropAddressProvider } from "@wonderland/interop-addresses";

// With checksum (recommended for sharing)
const humanReadableAddress = "alice.eth@eip155:1#ABCD1234";
const binaryAddress = await InteropAddressProvider.humanReadableToBinary(humanReadableAddress);

const humanReadableAddress = "alice.eth@eip155:1#ABCD1234";
const binaryAddress = await humanReadableToBinary(humanReadableAddress);
```

## API

### [InteropAddressProvider](./src/providers/InteropAddressProvider.ts)

Available methods

-   `humanReadableToBinary(humanReadableAddress: string): Promise<BinaryAddress>`
-   `binaryToHumanReadable(binaryAddress: Hex): HumanReadableAddress`
-   `getChainId(humanReadableAddress | binaryAddress): Promise<EncodedChainReference<ChainTypeName>>`
-   `getAddress(humanReadableAddress | binaryAddress): Promise<EncodedAddress<ChainTypeName>>`
-   `buildFromPayload(payload: InteropAddressFields): BinaryAddress`
-   `computeChecksum(humanReadableAddress: string): Promise<Checksum>`

All methods are also exported as individual functions to allow maximum modularity and tree-shaking

## References

-   [ERC-7930: Interoperable Addresses - Fellowship of Ethereum Magicians](https://ethereum-magicians.org/t/erc-7930-interoperable-addresses/23365)
-   [ERC-7828: Interoperable Names using ENS](https://ethereum-magicians.org/t/erc-7828-chain-specific-addresses-using-ens/21930)

## ERC Compliance

This package implements:

### ERC-7930 (Interoperable Addresses)

-   ✅ Binary format with version, chain type, chain reference, and address
-   ✅ Human-readable format: `<address>@<namespace>:<reference>#<checksum>`
-   ✅ Checksum calculation (first 4 bytes of keccak256 hash)
-   ✅ Support for zero-length addresses and chain references
-   ✅ Versioning support

### ERC-7828 (Interoperable Names using ENS)

-   ✅ Optional checksums (required when sharing, optional when receiving)
-   ✅ ENS name resolution for addresses (e.g., `alice.eth@eip155:1`)
-   ✅ Validation: ENS names MUST include chain reference
-   ✅ Context-aware error handling for ENS vs raw addresses
-   ⚠️ ENS chain registry integration (pending - registry not yet deployed)

### Not Yet Implemented

-   ⏳ ENS chain label resolution (e.g., `address@ethereum` → resolves via ENS)
-   ⏳ Reverse chain name lookup via ENS
-   ⏳ Chain discovery via ENS registry (`chainCount`, `getChainAtIndex`)

## Local development

1. Install dependencies running `pnpm install`

### Available Scripts

Available scripts that can be run using `pnpm`:

| Script        | Description                                             |
| ------------- | ------------------------------------------------------- |
| `build`       | Build library using tsc                                 |
| `check-types` | Check types issues using tsc                            |
| `clean`       | Remove `dist` folder                                    |
| `lint`        | Run ESLint to check for coding standards                |
| `lint:fix`    | Run linter and automatically fix code formatting issues |
| `format`      | Check code formatting and style using Prettier          |
| `format:fix`  | Run formatter and automatically fix issues              |
| `test`        | Run tests using vitest                                  |
| `test:cov`    | Run tests with coverage report                          |
