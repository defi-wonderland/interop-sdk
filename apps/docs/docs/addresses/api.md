---
title: API
---

## High-Level Convenience Methods

All high-level methods are available as static methods on `InteropAddressProvider` or as standalone exported functions.

### Async Methods (Name Layer)

These methods may perform ENS resolution or chain label resolution.

#### `nameToBinary`

Converts an interoperable name to a binary address.

```typescript
nameToBinary(
  name: string | ParsedInteropNameComponents,
  opts?: { format?: "hex" | "bytes" }
): Promise<Hex | Uint8Array>
```

**Example:**

```typescript
import { nameToBinary } from "@wonderland/interop-addresses";

const binary = await nameToBinary("vitalik.eth@eip155:1#4CA88C9C", { format: "hex" });
```

#### `getAddress`

Extracts the address component from a binary address or interoperable name.

```typescript
getAddress(address: string): Promise<string>
```

**Example:**

```typescript
import { getAddress } from "@wonderland/interop-addresses";

const address = await getAddress("vitalik.eth@eip155:1#4CA88C9C");
// Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
```

#### `getChainId`

Extracts the chain reference from a binary address or interoperable name.

```typescript
getChainId(address: string): Promise<string>
```

**Example:**

```typescript
import { getChainId } from "@wonderland/interop-addresses";

const chainId = await getChainId("vitalik.eth@eip155:1#4CA88C9C");
// Returns: "1"
```

#### `computeChecksum`

Computes the checksum for an interoperable name.

```typescript
computeChecksum(interoperableName: string): Promise<Checksum>
```

**Example:**

```typescript
import { computeChecksum } from "@wonderland/interop-addresses";

const checksum = await computeChecksum("vitalik.eth@eip155:1");
// Returns: "4CA88C9C"
```

#### `isValidInteropAddress`

Validates if an address (binary or name) is a valid interop address.

```typescript
isValidInteropAddress(
  address: string,
  options?: ParseInteroperableNameOptions
): Promise<boolean>
```

**Example:**

```typescript
import { isValidInteropAddress } from "@wonderland/interop-addresses";

const isValid = await isValidInteropAddress("vitalik.eth@eip155:1#4CA88C9C", {
    validateChecksumFlag: true,
});
```

#### `isValidInteroperableName`

Validates if an interoperable name is valid.

```typescript
isValidInteroperableName(
  interoperableName: string,
  options?: ParseInteroperableNameOptions
): Promise<boolean>
```

**Example:**

```typescript
import { isValidInteroperableName } from "@wonderland/interop-addresses";

const isValid = await isValidInteroperableName("vitalik.eth@eip155:1#4CA88C9C");
```

### Synchronous Methods

#### `binaryToName`

Converts a binary address to an interoperable name (synchronous).

```typescript
binaryToName(binaryAddress: Hex | Uint8Array): InteroperableName
```

**Example:**

```typescript
import { binaryToName } from "@wonderland/interop-addresses";

const name = binaryToName("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
// Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C"
```

#### `isValidBinaryAddress`

Checks if a binary address is valid (synchronous).

```typescript
isValidBinaryAddress(binaryAddress: Hex): boolean
```

**Example:**

```typescript
import { isValidBinaryAddress } from "@wonderland/interop-addresses";

const isValid = isValidBinaryAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
```

## Direct Layer Functions

### Address Layer

#### `decodeAddress`

Decodes a binary address into an `InteroperableAddress` object. Defaults to text representation.

```typescript
// Binary output
decodeAddress(
  value: Uint8Array | Hex,
  opts: { representation: "binary" }
): InteroperableAddressBinary;

// Text output (default)
decodeAddress(
  value: Uint8Array | Hex,
  opts?: { representation?: "text" }
): InteroperableAddressText;
```

**Returns:** Address in the specified representation (defaults to "text"):

-   Text variant: `chainType: "eip155" | "solana"`, `chainReference?: string`, `address?: string`
-   Binary variant: `chainType: Uint8Array`, `chainReference?: Uint8Array`, `address?: Uint8Array`

**Example:**

```typescript
// Get text representation (default)
const textAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
// textAddr.chainType is "eip155" (string)

// Get binary representation
const binaryAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045", {
    representation: "binary",
});
// binaryAddr.chainType is Uint8Array
```

#### `encodeAddress`

Encodes an `InteroperableAddress` object to binary format. Accepts either binary or text representation and converts automatically. Validates the input before encoding.

> **Note**: "Binary format" here refers to the ERC-7930 serialization format, not the JavaScript type. The encoded result can be either a hex string (`Hex`, default) or `Uint8Array` bytes, depending on the `format` option.

```typescript
encodeAddress(
  addr: InteroperableAddress,
  opts?: { format?: "hex" | "bytes" }
): Hex | Uint8Array
```

**Throws:**

-   `InvalidInteroperableAddress` - If the address doesn't match the schema

**Example:**

```typescript
// Encode text representation
const textAddr = { version: 1, chainType: "eip155", chainReference: "1", address: "0x..." };
const hex = encodeAddress(textAddr, { format: "hex" }); // Automatically converts

// Encode binary representation
const binaryAddr = decodeAddress("0x...", { representation: "binary" });
const hex2 = encodeAddress(binaryAddr, { format: "hex" });
```

#### `toBinaryRepresentation`

Converts a text representation to a binary representation. Validates the input before converting.

```typescript
toBinaryRepresentation(addr: InteroperableAddress): InteroperableAddress
```

**Throws:**

-   `InvalidInteroperableAddress` - If the address doesn't match the schema

**Example:**

```typescript
const textAddr = { version: 1, chainType: "eip155", chainReference: "1", address: "0x..." };
const binaryAddr = toBinaryRepresentation(textAddr);
// Returns binary variant (chainType: Uint8Array, etc.)
```

#### `toTextRepresentation`

Converts a binary representation to a text representation.

```typescript
toTextRepresentation(addr: InteroperableAddress): InteroperableAddress
```

**Example:**

```typescript
const binaryAddr = decodeAddress("0x...", { representation: "binary" });
const textAddr = toTextRepresentation(binaryAddr);
// Returns text variant (chainType: "eip155", etc.)
```

#### `calculateChecksum`

Calculates the checksum for an `InteroperableAddress`. Accepts either representation and converts automatically.

```typescript
calculateChecksum(addr: InteroperableAddress): Checksum
```

#### `validateInteroperableAddress`

Validates an `InteroperableAddress` structure. Accepts either representation.

```typescript
validateInteroperableAddress(addr: InteroperableAddress): InteroperableAddress
```

**Throws:**

-   `InvalidInteroperableAddress` - If the address doesn't match the schema (invalid version, chainType, chainReference, or address format)

#### `validateChecksum`

Validates a checksum against an `InteroperableAddress`. Accepts either representation and converts automatically.

```typescript
validateChecksum(
  interopAddress: InteroperableAddress,
  checksum: Checksum,
  options?: ValidateChecksumOptions
): void
```

### Name Layer

#### `parseName`

Parses an interoperable name with full metadata. Defaults to text representation.

```typescript
// Binary output
parseName(
  input: string | ParsedInteropNameComponents,
  opts: { representation: "binary" }
): Promise<ParsedInteroperableNameResult<InteroperableAddressBinary>>;

// Text output (default)
parseName(
  input: string | ParsedInteropNameComponents,
  opts?: { representation?: "text" }
): Promise<ParsedInteroperableNameResult<InteroperableAddressText>>;
```

**Returns:**

```typescript
{
  name: ParsedInteropNameComponents;      // Original parsed components
  address: InteroperableAddress;          // Address in specified representation (defaults to "text")
  meta: {
    checksum: Checksum;                    // Calculated checksum
    checksumMismatch?: {                   // If provided checksum didn't match
      provided: Checksum;
      calculated: Checksum;
    };
    isENS: boolean;                        // Whether address was ENS
    isChainLabel: boolean;                 // Whether chain reference was a label
  };
}
```

The `address` field is an `InteroperableAddress` in the requested representation. Use type guards to access fields:

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

#### `formatName`

Formats an `InteroperableAddress` into an interoperable name. Accepts either representation and converts automatically. Validates the input and calculates the checksum internally.

```typescript
formatName(
  addr: InteroperableAddress,
  opts?: { includeChecksum?: boolean }
): InteroperableName
```

**Throws:**

-   `InvalidInteroperableAddress` - If the address doesn't match the schema

**Example:**

```typescript
import { decodeAddress, formatName } from "@wonderland/interop-addresses";

// Format from text representation (checksum included by default)
const textAddr = { version: 1, chainType: "eip155", chainReference: "1", address: "0x..." };
const name = formatName(textAddr);

// Format from binary representation
const binaryAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045", {
    representation: "binary",
});
const name2 = formatName(binaryAddr); // Automatically converts and includes checksum

// Format without checksum
const name3 = formatName(textAddr, { includeChecksum: false });
```

#### `isValidChain`

Validates a chain identifier for a given chain type.

```typescript
isValidChain(chainType: ChainTypeName, chainReference: string): boolean
```

#### `isValidChainType`

Validates that a chain type is a supported CAIP profile.

```typescript
isValidChainType(chainType: string): chainType is ChainTypeName
```

#### `resolveAddress`

Resolves an address, handling ENS names if applicable.

```typescript
resolveAddress(
  address: string,
  chainType: ChainTypeName,
  chainReference: string | undefined
): Promise<ResolvedAddress>
```

#### `resolveChain`

Resolves and validates chain identifier components. Handles cases where both chainType and chainReference are provided, only chainType is provided, or only chainReference is provided (resolves shortnames).

```typescript
resolveChain(
  input: { chainType?: string; chainReference?: string }
): Promise<{ chainType: ChainTypeName; chainReference?: string }>
```

#### `shortnameToChainId`

Resolves a chain shortname to its chain ID.

```typescript
shortnameToChainId(shortName: string): Promise<number | undefined>
```

## Importing Functions

All methods are exported as individual functions for modular usage and tree-shaking:

```typescript
import {
    binaryToName,
    calculateChecksum,
    computeChecksum,
    decodeAddress,
    encodeAddress,
    formatName,
    getAddress,
    getChainId,
    isBinaryAddress,
    isTextAddress,
    isValidBinaryAddress,
    isValidChain,
    isValidChainType,
    isValidInteropAddress,
    isValidInteroperableName,
    nameToBinary,
    parseName,
    resolveAddress,
    resolveChain,
    shortnameToChainId,
    toBinaryRepresentation,
    toTextRepresentation,
    validateChecksum,
    validateInteroperableAddress,
} from "@wonderland/interop-addresses";
```

## Types

### `InteroperableAddress`

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
import { decodeAddress, isTextAddress } from "@wonderland/interop-addresses";

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

### `InteroperableName`

The ERC-7828-style human-readable name string:

```typescript
type InteroperableName = string; // e.g., "vitalik.eth@eip155:1#4CA88C9C"
```

### `ParsedInteropNameComponents`

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

**Example:**

```typescript
import { nameToBinary } from "@wonderland/interop-addresses";

const parsed = {
    address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    chainType: "eip155",
    chainReference: "1",
    checksum: undefined,
};
const binary = await nameToBinary(parsed, { format: "hex" });
```

### `ParsedInteroperableNameResult`

The result from `parseName`:

```typescript
{
  name: ParsedInteropNameComponents;
  interoperableAddress: InteroperableAddress;  // Address in specified representation (defaults to "text")
  meta: {
    checksum: Checksum;
    checksumMismatch?: { provided: Checksum; calculated: Checksum };
    isENS: boolean;
    isChainLabel: boolean;
  };
}
```

The `interoperableAddress` field contains the `InteroperableAddress` type in the requested representation (defaults to "text"). Use type guards to access fields:

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

## References

-   [EIP-7930: Interoperable Addresses](https://eips.ethereum.org/EIPS/eip-7930)
-   [ERC-7828: Readable Interoperable Addresses using ENS](https://eips.ethereum.org/EIPS/eip-7828)
-   [CAIP-350: Interoperable Addresses](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-350.md)
