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
getAddress(address: string): Promise<EncodedAddress<ChainTypeName>>
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
getChainId(address: string): Promise<EncodedChainReference<ChainTypeName>>
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

#### `textToBinary`

Converts structured text to binary (synchronous).

```typescript
textToBinary(
  text: InteroperableAddressText,
  opts?: { format?: "hex" | "bytes" }
): Hex | Uint8Array
```

**Example:**

```typescript
import { textToBinary } from "@wonderland/interop-addresses";

const text = {
    version: 1,
    chainType: "eip155",
    chainReference: "1",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
};
const binary = textToBinary(text, { format: "hex" });
```

#### `binaryToText`

Converts binary to structured text (synchronous).

```typescript
binaryToText(binaryAddress: Hex | Uint8Array): InteroperableAddressText
```

**Example:**

```typescript
import { binaryToText } from "@wonderland/interop-addresses";

const text = binaryToText("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
// Returns: { version: 1, chainType: "eip155", chainReference: "1", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" }
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

### Binary Layer

#### `decodeInteroperableAddress`

Decodes a binary address into an `InteroperableAddress` object.

```typescript
decodeInteroperableAddress(value: Uint8Array | Hex): InteroperableAddress
```

#### `encodeInteroperableAddress`

Encodes an `InteroperableAddress` object to binary format.

```typescript
encodeInteroperableAddress(
  addr: InteroperableAddress,
  opts?: { format?: "hex" | "bytes" }
): Hex | Uint8Array
```

#### `calculateChecksum`

Calculates the checksum for an `InteroperableAddress`.

```typescript
calculateChecksum(addr: InteroperableAddress): Checksum
```

#### `validateInteroperableAddress`

Validates an `InteroperableAddress` structure.

```typescript
validateInteroperableAddress(addr: InteroperableAddress): InteroperableAddress
```

#### `validateChecksum`

Validates a checksum against an `InteroperableAddress`.

```typescript
validateChecksum(
  interopAddress: InteroperableAddress,
  checksum: Checksum,
  options?: ValidateChecksumOptions
): void
```

### Text Layer

#### `toText`

Converts a binary address to structured text.

```typescript
toText(addr: InteroperableAddress): InteroperableAddressText
```

#### `toBinary`

Converts structured text to a binary address.

```typescript
toBinary(text: InteroperableAddressText): InteroperableAddress
```

### Name Layer

#### `parseInteroperableName`

Parses an interoperable name with full metadata.

```typescript
parseInteroperableName(
  input: string | ParsedInteropNameComponents
): Promise<ParsedInteroperableNameResult>
```

**Returns:**

```typescript
{
  name: ParsedInteropNameComponents;      // Original parsed components
  text: InteroperableAddressText;         // CAIP-350 text representation
  address: InteroperableAddress;          // Binary address
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

#### `formatInteroperableName`

Formats structured text and checksum into an interoperable name.

```typescript
formatInteroperableName(
  text: InteroperableAddressText,
  checksum: Checksum
): InteroperableName
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
  chainNamespace: ChainTypeName,
  chainReference: string | undefined
): Promise<ResolvedAddress>
```

#### `resolveChainReference`

Resolves a chain reference to its chain type and reference.

```typescript
resolveChainReference(
  chainReference: string
): Promise<{ chainType: ChainTypeName; chainReference: string } | null>
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
    binaryToText,
    calculateChecksum,
    computeChecksum,
    // Binary layer
    decodeInteroperableAddress,
    encodeInteroperableAddress,
    formatInteroperableName,
    getAddress,
    getChainId,
    isValidBinaryAddress,
    isValidChain,
    isValidChainType,
    isValidInteropAddress,
    isValidInteroperableName,
    // High-level convenience methods
    nameToBinary,
    // Name layer
    parseInteroperableName,
    resolveAddress,
    resolveChainReference,
    shortnameToChainId,
    textToBinary,
    toBinary,
    // Text layer
    toText,
    validateChecksum,
    validateInteroperableAddress,
} from "@wonderland/interop-addresses";
```

## Types

### `InteroperableAddress`

The canonical binary representation (EIP-7930 object):

```typescript
{
    version: number;
    chainType: Uint8Array;
    chainReference: Uint8Array;
    address: Uint8Array;
}
```

### `InteroperableAddressText`

The CAIP-350 structured text representation:

```typescript
{
  version: number;
  chainType: ChainTypeName; // e.g., "eip155"
  chainReference?: string;   // e.g., "1"
  address?: string;          // e.g., "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
}
```

### `InteroperableName`

The ERC-7828-style human-readable name string:

```typescript
type InteroperableName = string; // e.g., "vitalik.eth@eip155:1#4CA88C9C"
```

### `ParsedInteropNameComponents`

The raw parsed components from an Interoperable Name string:

```typescript
{
    address: string;
    chainType: string | undefined;
    chainReference: string;
    checksum: string | undefined;
}
```

This type represents the raw components extracted from parsing an interoperable name string. It can be used directly as input to `parseInteroperableName` or `nameToBinary` instead of a string.

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

The result from `parseInteroperableName`:

```typescript
{
  name: ParsedInteropNameComponents;
  text: InteroperableAddressText;
  address: InteroperableAddress;
  meta: {
    checksum: Checksum;
    checksumMismatch?: { provided: Checksum; calculated: Checksum };
    isENS: boolean;
    isChainLabel: boolean;
  };
}
```

## References

-   [EIP-7930: Interoperable Addresses](https://eips.ethereum.org/EIPS/eip-7930)
-   [ERC-7828: Readable Interoperable Addresses using ENS](https://eips.ethereum.org/EIPS/eip-7828)
-   [CAIP-350: Interoperable Addresses](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-350.md)
