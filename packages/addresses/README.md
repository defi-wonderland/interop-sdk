# @wonderland/interop-addresses

A TypeScript library for handling interoperable blockchain addresses across different networks.

This package provides methods to convert between interoperable names (ERC-7828), structured objects with CAIP-350 text-encoded fields, and binary addresses (EIP-7930), following a clean two-layer architecture.

## Installation

```
pnpm add @wonderland/interop-addresses
```

## Architecture

The package follows a clean two-layer architecture:

### 1. Address Layer (EIP-7930 + CAIP-350)

Discriminated union address representation - either binary or text, but not both. Functions automatically convert between representations as needed. Synchronous encoding/decoding operations.

**Key Functions:**

-   `decodeAddress(value: Uint8Array | Hex, opts?: { representation?: "binary" | "text" }): InteroperableAddress` - Decodes binary to address (defaults to "text" representation). TypeScript overloads ensure that `representation: "binary"` returns `InteroperableAddressBinary`, otherwise `InteroperableAddressText`.
-   `encodeAddress(addr: InteroperableAddress, opts?: { format?: "hex" | "bytes" }): Hex | Uint8Array` - Encodes address to binary (accepts either representation)
-   `toBinaryRepresentation(addr: InteroperableAddress): InteroperableAddress` - Converts text representation to binary
-   `toTextRepresentation(addr: InteroperableAddress): InteroperableAddress` - Converts binary representation to text
-   `calculateChecksum(addr: InteroperableAddress): Checksum` - Calculates checksum (accepts either representation)
-   `validateInteroperableAddress(addr: InteroperableAddress): InteroperableAddress` - Validates address (accepts either representation)
-   `validateChecksum(addr: InteroperableAddress, checksum: Checksum, options?: ValidateChecksumOptions): void` - Validates checksum (accepts either representation)

### 2. Name Layer (ERC-7828)

Human-readable names with ENS resolution. Async operations for resolution.

**Key Functions:**

-   `parseName(input: string | ParsedInteropNameComponents, opts?: { representation?: "binary" | "text" }): Promise<ParsedInteroperableNameResult>` (Name → Address, defaults to "text" representation). TypeScript overloads ensure that `representation: "binary"` returns `ParsedInteroperableNameResult<InteroperableAddressBinary>`, otherwise `ParsedInteroperableNameResult<InteroperableAddressText>`.
-   `formatName(addr: InteroperableAddress, opts?: { includeChecksum?: boolean }): InteroperableName` (Address → Name, accepts either representation, calculates checksum automatically)

## Usage

### High-Level Convenience Methods

The `InteropAddressProvider` class provides convenient async methods for common operations:

```typescript
// Convert binary to text representation (synchronous)
import {
    binaryToName,
    decodeAddress,
    encodeAddress,
    nameToBinary,
} from "@wonderland/interop-addresses";

// Convert name to binary (async - may resolve ENS)
const binary = await nameToBinary("vitalik.eth@eip155:1#4CA88C9C", { format: "hex" });

// Convert binary to name (synchronous)
const name = binaryToName("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");

// Convert text representation to binary (synchronous)
const textAddr = {
    version: 1,
    chainType: "eip155",
    chainReference: "1",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
};
const binaryFromText = encodeAddress(textAddr, { format: "hex" });

const textFromBinary = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045", {
    representation: "text",
});
```

### Direct Layer Functions

You can also use the layer functions directly for more control:

```typescript
import {
    calculateChecksum,
    decodeAddress,
    encodeAddress,
    formatName,
    isTextAddress,
    parseName,
    toBinaryRepresentation,
    toTextRepresentation,
} from "@wonderland/interop-addresses";

// Parse name with full result (includes metadata) - defaults to text representation
const result = await parseName("vitalik.eth@eip155:1#4CA88C9C");
// result.name - original parsed components
// result.interoperableAddress - address in text representation (default)
//   - result.interoperableAddress.chainType - "eip155" (string)
//   - result.interoperableAddress.chainReference - "1" (string)
//   - result.interoperableAddress.address - "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" (string)
// result.meta.checksum - calculated checksum
// result.meta.checksumMismatch - if provided checksum didn't match
// result.meta.isENS - whether address was ENS
// result.meta.isChainLabel - whether chain reference was a label

// Parse to binary representation
const resultBinary = await parseName("vitalik.eth@eip155:1#4CA88C9C", { representation: "binary" });
// resultBinary.interoperableAddress.chainType - Uint8Array
// resultBinary.interoperableAddress.chainReference - Uint8Array
// resultBinary.interoperableAddress.address - Uint8Array

// Decode binary to text representation (default)
const textAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
// textAddr.chainType - "eip155" (string)
// textAddr.chainReference - "1" (string)
// textAddr.address - "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" (string)

// Decode binary to binary representation
const binaryAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045", {
    representation: "binary",
});
// binaryAddr.chainType - Uint8Array
// binaryAddr.chainReference - Uint8Array
// binaryAddr.address - Uint8Array

// Use type guards to narrow the type
if (isTextAddress(textAddr)) {
    console.log(textAddr.chainType); // TypeScript knows this is a string
}

// Convert between representations
const textToBinary = toBinaryRepresentation(textAddr);
const binaryToText = toTextRepresentation(binaryAddr);

// Encode address to binary (accepts either representation)
const textAddr2 = {
    version: 1,
    chainType: "eip155",
    chainReference: "1",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
};
const hex = encodeAddress(textAddr2, { format: "hex" }); // Automatically converts text to binary

// Format name (accepts either representation, calculates checksum automatically)
const name = formatName(textAddr); // Automatically converts if needed and includes checksum
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

-   `isValidBinaryAddress(binaryAddress: Hex): boolean`
    -   Checks if a binary address is valid (synchronous).

### Direct Layer Functions

#### Address Layer

-   `decodeAddress(value: Uint8Array | Hex, opts?: { representation?: "binary" | "text" }): InteroperableAddress` - Decodes binary to address (defaults to "text")
-   `encodeAddress(addr: InteroperableAddress, opts?: { format?: "hex" | "bytes" }): Hex | Uint8Array` - Encodes address to binary (accepts either representation)
-   `toBinaryRepresentation(addr: InteroperableAddress): InteroperableAddress` - Converts text representation to binary
-   `toTextRepresentation(addr: InteroperableAddress): InteroperableAddress` - Converts binary representation to text
-   `calculateChecksum(addr: InteroperableAddress): Checksum` - Calculates checksum (accepts either representation)
-   `validateInteroperableAddress(addr: InteroperableAddress): InteroperableAddress` - Validates address (accepts either representation)
-   `validateChecksum(addr: InteroperableAddress, checksum: Checksum, options?: ValidateChecksumOptions): void` - Validates checksum (accepts either representation)

#### Name Layer

-   `parseName(input: string | ParsedInteropNameComponents, opts?: { representation?: "binary" | "text" }): Promise<ParsedInteroperableNameResult>` - Parses name to address (defaults to "text")
-   `formatName(addr: InteroperableAddress, opts?: { includeChecksum?: boolean }): InteroperableName` - Formats address to name (accepts either representation, calculates checksum automatically)
-   `isValidChain(chainType: ChainTypeName, chainReference: string): boolean`
-   `isValidChainType(chainType: string): chainType is ChainTypeName`
-   `resolveAddress(address: string, chainType: ChainTypeName, chainReference: string | undefined): Promise<ResolvedAddress>`
-   `resolveChain(input: { chainType?: string; chainReference?: string }): Promise<ResolvedChain>`
-   `shortnameToChainId(shortname: string): number | null`

## Types

### InteroperableAddress

A discriminated union type that represents either binary or text fields, but not both. TypeScript narrows based on the `chainType` field type:

```typescript
type InteroperableAddress =
    | {
          version: number;
          chainType: Uint8Array; // Binary variant
          chainReference?: Uint8Array;
          address?: Uint8Array;
      }
    | {
          version: number;
          chainType: "eip155" | "solana"; // Text variant
          chainReference?: string;
          address?: string;
      };
```

**Type Guards:**

-   `isTextAddress(addr: InteroperableAddress): boolean` - Check if address is text variant
-   `isBinaryAddress(addr: InteroperableAddress): boolean` - Check if address is binary variant

**Usage:**

```typescript
import { isTextAddress } from "@wonderland/interop-addresses";

const addr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");

if (isTextAddress(addr)) {
    // TypeScript knows addr.chainType is "eip155" | "solana"
    console.log(addr.chainType); // "eip155"
    console.log(addr.chainReference); // "1" (string)
    console.log(addr.address); // "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" (string)
} else {
    // TypeScript knows addr.chainType is Uint8Array
    console.log(addr.chainType); // Uint8Array
    console.log(addr.chainReference); // Uint8Array | undefined
    console.log(addr.address); // Uint8Array | undefined
}
```

The text variant uses CAIP-350's text encoding rules, which are chainType-specific:

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
    address?: string;
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
  address: InteroperableAddress;          // Address in specified representation (defaults to "text")
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

The `address` field contains the `InteroperableAddress` type in the requested representation (defaults to "text"). Use type guards to access fields:

```typescript
import { isTextAddress } from "@wonderland/interop-addresses";

const result = await parseName("vitalik.eth@eip155:1#4CA88C9C");

if (isTextAddress(result.interoperableAddress)) {
    // Access text fields directly
    console.log(result.interoperableAddress.chainType); // "eip155"
    console.log(result.interoperableAddress.chainReference); // "1"
    console.log(result.interoperableAddress.address); // "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
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
