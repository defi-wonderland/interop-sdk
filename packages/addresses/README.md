# @wonderland/interop-addresses

A TypeScript library for handling interoperable blockchain addresses across different networks.

This package provides methods to convert between interoperable names (ERC-7828), structured objects with CAIP-350 text-encoded fields, and binary addresses (EIP-7930), following a clean three-layer architecture.

## Installation

```
pnpm add @wonderland/interop-addresses
```

## Architecture

The package follows a three-layer architecture:

### 1. Binary Core Layer (EIP-7930)

Pure binary encoding/decoding of interoperable addresses. Synchronous, no dependencies on other layers.

**Key Functions:**

-   `decodeAddress(value: Uint8Array | Hex): InteroperableAddress`
-   `encodeAddress(addr: InteroperableAddress, opts?: { format?: "hex" | "bytes" }): Hex | Uint8Array`
-   `calculateChecksum(addr: InteroperableAddress): Checksum`
-   `validateInteroperableAddress(addr: InteroperableAddress): InteroperableAddress`
-   `validateChecksum(addr: InteroperableAddress, checksum: Checksum, options?: ValidateChecksumOptions): void`

### 2. Text Layer (CAIP-350)

Structured objects with fields using CAIP-350 text serialization rules. Synchronous conversion between binary and structured representations.

**Key Functions:**

-   `toAddressText(addr: InteroperableAddress): InteroperableAddressText` (Binary → Text)
-   `toAddress(text: InteroperableAddressText): InteroperableAddress` (Text → Binary)

### 3. Name Layer (ERC-7828)

Human-readable names with ENS resolution. Async operations for resolution.

**Key Functions:**

-   `parseName(input: string | ParsedInteropNameComponents): Promise<ParsedInteroperableNameResult>` (Name → Text + Binary)
-   `formatName(text: InteroperableAddressText, checksum: Checksum): InteroperableName` (Text → Name)

## Usage

### High-Level Convenience Methods

The `InteropAddressProvider` class provides convenient async methods for common operations:

```typescript
import {
    addressTextToBinary,
    binaryToAddressText,
    binaryToName,
    nameToBinary,
} from "@wonderland/interop-addresses";

// Convert name to binary (async - may resolve ENS)
const binary = await nameToBinary("vitalik.eth@eip155:1#4CA88C9C", { format: "hex" });

// Convert binary to name (synchronous)
const name = binaryToName("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");

// Convert text to binary (synchronous)
const text: InteroperableAddressText = {
    version: 1,
    chainType: "eip155",
    chainReference: "1",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
};
const binaryFromText = addressTextToBinary(text, { format: "hex" });

// Convert binary to text (synchronous)
const textFromBinary = binaryToAddressText(
    "0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045",
);
```

### Direct Layer Functions

You can also use the layer functions directly for more control:

```typescript
import {
    calculateChecksum,
    decodeAddress,
    encodeAddress,
    formatName,
    parseName,
    toAddress,
    toAddressText,
} from "@wonderland/interop-addresses";

// Parse name with full result (includes metadata)
const result = await parseName("vitalik.eth@eip155:1#4CA88C9C");
// result.name - original parsed components
// result.text - structured object with CAIP-350 text-encoded fields
// result.address - binary address (InteroperableAddress)
// result.meta.checksum - calculated checksum
// result.meta.checksumMismatch - if provided checksum didn't match
// result.meta.isENS - whether address was ENS
// result.meta.isChainLabel - whether chain reference was a label

// Convert binary to text
const addr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
const text = toAddressText(addr);

// Convert text to binary
const binary = toAddress(text);
const hex = encodeAddress(binary, { format: "hex" });
```

### Extracting Components

```typescript
import { getAddress, getChainId } from "@wonderland/interop-addresses";

// Get address from binary or name
const address = await getAddress("vitalik.eth@eip155:1#4CA88C9C");
// Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

// Get chain ID from binary or name
const chainId = await getChainId("vitalik.eth@eip155:1#4CA88C9C");
// Returns: "1"
```

## API Reference

### High-Level Methods (InteropAddressProvider)

All methods are available as static methods on `InteropAddressProvider` or as standalone exported functions.

#### Async Methods (Name Layer)

-   `nameToBinary(name: string | ParsedInteropNameComponents, opts?: { format?: "hex" | "bytes" }): Promise<Hex | Uint8Array>`

    -   Converts an interoperable name to binary. May resolve ENS names or chain labels.

-   `getAddress(address: string): Promise<EncodedAddress<ChainTypeName>>`

    -   Extracts the address component from a binary address or interoperable name.

-   `getChainId(address: string): Promise<EncodedChainReference<ChainTypeName>>`

    -   Extracts the chain reference from a binary address or interoperable name.

-   `computeChecksum(interoperableName: string): Promise<Checksum>`

    -   Computes the checksum for an interoperable name.

-   `isValidInteropAddress(address: string, options?: ParseInteroperableNameOptions): Promise<boolean>`

    -   Validates if an address (binary or name) is a valid interop address.

-   `isValidInteroperableName(interoperableName: string, options?: ParseInteroperableNameOptions): Promise<boolean>`
    -   Validates if an interoperable name is valid.

#### Synchronous Methods

-   `binaryToName(binaryAddress: Hex | Uint8Array): InteroperableName`

    -   Converts a binary address to an interoperable name (synchronous).

-   `addressTextToBinary(text: InteroperableAddressText, opts?: { format?: "hex" | "bytes" }): Hex | Uint8Array`

    -   Converts structured object with CAIP-350 text-encoded fields to binary (synchronous).

-   `binaryToAddressText(binaryAddress: Hex | Uint8Array): InteroperableAddressText`

    -   Converts binary to structured object with CAIP-350 text-encoded fields (synchronous).

-   `isValidBinaryAddress(binaryAddress: Hex): boolean`
    -   Checks if a binary address is valid (synchronous).

### Direct Layer Functions

#### Binary Layer

-   `decodeAddress(value: Uint8Array | Hex): InteroperableAddress`
-   `encodeAddress(addr: InteroperableAddress, opts?: { format?: "hex" | "bytes" }): Hex | Uint8Array`
-   `calculateChecksum(addr: InteroperableAddress): Checksum`
-   `validateInteroperableAddress(addr: InteroperableAddress): InteroperableAddress`
-   `validateChecksum(addr: InteroperableAddress, checksum: Checksum, options?: ValidateChecksumOptions): void`

#### Text Layer

-   `toAddressText(addr: InteroperableAddress): InteroperableAddressText`
-   `toAddress(text: InteroperableAddressText): InteroperableAddress`

#### Name Layer

-   `parseName(input: string | ParsedInteropNameComponents): Promise<ParsedInteroperableNameResult>`
-   `formatName(text: InteroperableAddressText, checksum: Checksum): InteroperableName`
-   `isValidChain(chainType: ChainTypeName, chainReference: string): boolean`
-   `isValidChainType(chainType: string): chainType is ChainTypeName`
-   `resolveAddress(address: string, chainNamespace: ChainTypeName, chainReference: string | undefined): Promise<ResolvedAddress>`
-   `resolveChain(input: { chainType?: string; chainReference?: string }): Promise<ResolvedChain>`
-   `shortnameToChainId(shortname: string): number | null`

## Types

### InteroperableAddress

The canonical binary representation (EIP-7930 object):

```typescript
{
    version: number;
    chainType: Uint8Array;
    chainReference: Uint8Array;
    address: Uint8Array;
}
```

### InteroperableAddressText

Structured object with fields using CAIP-350 text serialization rules (per chainType):

```typescript
{
  version: number;
  chainType: ChainTypeName; // e.g., "eip155"
  chainReference?: string;   // e.g., "1" (encoding per CAIP-350 for the chainType)
  address?: string;          // e.g., "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" (encoding per CAIP-350 for the chainType)
}
```

The fields use CAIP-350's text encoding rules, which are chainType-specific:

-   **eip155**: Chain references as decimal strings, addresses as hex strings with EIP-55 checksumming
-   **solana**: Chain references and addresses as base58-encoded strings
-   Other chain types follow their respective CAIP-350 encoding rules

### InteroperableName

The ERC-7828-style human-readable name string:

```typescript
type InteroperableName = string; // e.g., "vitalik.eth@eip155:1#4CA88C9C"
```

### ParsedInteropNameComponents

The raw parsed components from an Interoperable Name string:

```typescript
{
    address: string;
    chainType: string | undefined;
    chainReference: string;
    checksum: string | undefined;
}
```

This type represents the raw components extracted from parsing an interoperable name string. It can be used directly as input to `parseName` or `nameToBinary` instead of a string.

### ParsedInteroperableNameResult

The result from `parseName`:

```typescript
{
  name: ParsedInteropNameComponents;      // Original parsed components
  text: InteroperableAddressText;         // Structured object with CAIP-350 text-encoded fields
  address: InteroperableAddress;          // Structured Interoperable Address object with binary fields)
  meta: {
    checksum: Checksum;                    // Calculated checksum (always present)
    checksumMismatch?: {                   // Present if provided checksum didn't match
      provided: Checksum;
      calculated: Checksum;
    };
    isENS: boolean;                        // Whether address was resolved via ENS
    isChainLabel: boolean;                 // Whether chain reference was a label
  };
}
```

## Checksum Handling

-   **Always Calculated**: Checksums are always calculated from the binary address, even if not provided in the name.
-   **Mismatch Detection**: If a checksum is provided in the name but doesn't match the calculated checksum, it's stored in `meta.checksumMismatch` but doesn't throw an error.
-   **Validation**: Use `validateChecksum` from the binary layer to explicitly validate checksums.

## ERC Compliance

This package implements:

### EIP-7930 (Interoperable Addresses)

-   ✅ Binary format with version, chain type, chain reference, and address
-   ✅ Text serialization using CAIP-350 encoding rules: `<address>@<chainType>:<chainReference>`
-   ✅ Checksum calculation (first 4 bytes of keccak256 hash)
-   ✅ Support for zero-length addresses and chain references
-   ✅ Versioning support

### ERC-7828 (Interoperable Names using ENS)

-   ✅ Human-readable name format: `<address>@<chainType>:<chainReference>#<checksum>`
-   ✅ ENS name resolution for addresses (e.g., `alice.eth@eip155:1`)
-   ✅ Validation: ENS names MUST include chain reference
-   ✅ Context-aware error handling for ENS vs raw addresses
-   ⚠️ ENS chain registry integration (pending - registry not yet deployed)

### Not Yet Implemented

-   ⏳ ENS chain label resolution (e.g., `address@ethereum` → resolves via ENS)
-   ⏳ Reverse chain name lookup via ENS
-   ⏳ Chain discovery via ENS registry (`chainCount`, `getChainAtIndex`)

## Local Development

1. Install dependencies: `pnpm install`

### Available Scripts

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

## References

-   [EIP-7930: Interoperable Addresses](https://ethereum-magicians.org/t/erc-7930-interoperable-addresses/23365)
-   [ERC-7828: Interoperable Names using ENS](https://ethereum-magicians.org/t/erc-7828-chain-specific-addresses-using-ens/21930)
-   [CAIP-350: Interoperable Addresses](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-350.md)
