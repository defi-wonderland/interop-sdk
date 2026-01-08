---
title: Getting Started
---

The `addresses` package provides a robust solution for handling interoperable blockchain addresses across different networks, following the [EIP-7930](https://eips.ethereum.org/EIPS/eip-7930) and [ERC-7828](https://eips.ethereum.org/EIPS/eip-7828) standards. This guide will help you get started with using the package in your projects.

## Installing the Package

```bash
npm install @wonderland/interop-addresses
# or
yarn add @wonderland/interop-addresses
# or
pnpm add @wonderland/interop-addresses
```

## Architecture Overview

The package follows a clean three-layer architecture:

1. **Binary Layer (EIP-7930)**: Pure binary encoding/decoding - synchronous, no dependencies
2. **Text Layer (CAIP-350)**: Structured objects with fields using CAIP-350 text serialization rules - synchronous conversion
3. **Name Layer (ERC-7828)**: Human-readable names with ENS resolution - async operations

## Basic Usage

The package provides high-level convenience methods and direct layer functions:

### High-Level Convenience Methods

```typescript
import {
    addressTextToBinary,
    binaryToAddressText,
    binaryToName,
    nameToBinary,
} from "@wonderland/interop-addresses";

// Convert an interoperable name to binary (async - may resolve ENS)
const name = "vitalik.eth@eip155:1#4CA88C9C";
const binaryAddress = await nameToBinary(name, { format: "hex" });

// Convert binary to name (synchronous)
const nameFromBinary = binaryToName("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");

// Convert structured text to binary (synchronous)
const text = {
    version: 1,
    chainType: "eip155",
    chainReference: "1",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
};
const binaryFromText = addressTextToBinary(text, { format: "hex" });

// Convert binary to structured text (synchronous)
const textFromBinary = binaryToAddressText(
    "0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045",
);
```

### Extracting Components

```typescript
import { getAddress, getChainId } from "@wonderland/interop-addresses";

// Extract address from binary or name
const address = await getAddress("vitalik.eth@eip155:1#4CA88C9C");
// Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

// Extract chain ID from binary or name
const chainId = await getChainId("vitalik.eth@eip155:1#4CA88C9C");
// Returns: "1"
```

## Address Formats

The package supports four main address representations:

1. **Interoperable Name (ERC-7828)**: Human-readable string format

    - Format: `{address}@{chainType}:{chainReference}#{checksum}`
    - Example: `vitalik.eth@eip155:1#4CA88C9C`
    - Supports ENS names and chain labels
    - Requires async operations for resolution

2. **InteroperableAddressText (CAIP-350)**: Structured object with fields using CAIP-350 text serialization rules (per chainType)

    ```typescript
    {
      version: 1,
      chainType: "eip155",
      chainReference: "1",  // Encoding per CAIP-350 for eip155 (decimal string)
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"  // Encoding per CAIP-350 for eip155 (hex with EIP-55 checksum)
    }
    ```

    - Fields use CAIP-350 text encoding rules, which are chainType-specific:
        - **eip155**: Decimal strings for chain references, hex with EIP-55 checksumming for addresses
        - **solana**: Base58 encoding for both chain references and addresses
    - Synchronous conversions
    - No resolution needed
    - Used by the Text layer

3. **InteroperableAddress (EIP-7930)**: Structured object with binary fields

    ```typescript
    {
      version: 1,
      chainType: Uint8Array,      // 2 bytes
      chainReference: Uint8Array,  // Variable length
      address: Uint8Array          // Variable length
    }
    ```

    - Canonical binary object representation
    - Used by the Binary layer
    - Synchronous operations

4. **Binary Address (Serialized)**: Hex or bytes string representation
    - Example: `0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045`
    - Serialized form of InteroperableAddress
    - Used for storage and transmission
    - Synchronous operations

```mermaid
graph TD
    A[InteroperableName]
    B[InteroperableAddressText]
    C[InteroperableAddress]
    D[Binary Address]

    A -->|parseName async| B
    A -->|nameToBinary async| D
    B -->|toAddress sync| C
    B -->|addressTextToBinary sync| D
    C -->|encodeAddress sync| D
    C -->|toAddressText sync| B
    D -->|decodeAddress sync| C
    D -->|binaryToAddressText sync| B
    D -->|binaryToName sync| A
    B -->|formatName sync| A
```

## Working with Different Layers

### Name Layer (Async)

Use when you need ENS resolution or chain label resolution:

```typescript
import { nameToBinary, parseName } from "@wonderland/interop-addresses";

// Parse with full metadata
const result = await parseName("vitalik.eth@eip155:1#4CA88C9C");
// result.name - original parsed components
// result.text - structured object with CAIP-350 text-encoded fields
// result.address - binary address
// result.meta.checksum - calculated checksum
// result.meta.isENS - whether address was ENS
// result.meta.isChainLabel - whether chain reference was a label

// Simple conversion
const binary = await nameToBinary("vitalik.eth@eip155:1#4CA88C9C", { format: "hex" });
```

### Text Layer (Synchronous)

Use when you already have structured data with CAIP-350 text-encoded fields and don't need resolution:

```typescript
import {
    addressTextToBinary,
    binaryToAddressText,
    toAddress,
    toAddressText,
} from "@wonderland/interop-addresses";

// Convert structured object with CAIP-350 text-encoded fields to binary
const text = {
    version: 1,
    chainType: "eip155",
    chainReference: "1", // Encoding per CAIP-350 for eip155 (decimal string)
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // Encoding per CAIP-350 for eip155 (hex with EIP-55 checksum)
};
const binary = addressTextToBinary(text, { format: "hex" });

// Convert binary to structured object with CAIP-350 text-encoded fields
const textFromBinary = binaryToAddressText(
    "0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045",
);
```

### Binary Layer (Synchronous)

Use for direct binary operations:

```typescript
import { calculateChecksum, decodeAddress, encodeAddress } from "@wonderland/interop-addresses";

// Decode binary
const addr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");

// Encode to binary
const hex = encodeAddress(addr, { format: "hex" });

// Calculate checksum
const checksum = calculateChecksum(addr);
```

## Chain Resolution

The package resolves chain identifiers using off-chain registries:

-   **Primary**: Uses `shortnameToChainId` with built-in chain shortname mappings
-   **Fallback**: Uses viem's chain definitions and chainid.network

> We're currently working on the ENS on-chain chain registry, though it hasn't been deployed yet.
> For now, the SDK uses off-chain registries (such as chainid.network and viem) as the main resolution mechanism.

## References

-   [EIP-7930: Interoperable Addresses](https://eips.ethereum.org/EIPS/eip-7930)
-   [ERC-7828: Readable Interoperable Addresses using ENS](https://eips.ethereum.org/EIPS/eip-7828)
-   [CAIP-350: Interoperable Addresses](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-350.md)
