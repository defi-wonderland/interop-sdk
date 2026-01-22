---
title: Addresses
---

The addresses package provides a robust solution for handling interoperable blockchain addresses across different networks, following the [EIP-7930](https://eips.ethereum.org/EIPS/eip-7930) and [ERC-7828](https://eips.ethereum.org/EIPS/eip-7828) standards.

## Features

-   Interoperable address encoding and decoding (EIP-7930 + CAIP-350)
-   Human-readable name format with ENS resolution (ERC-7828)
-   Support for binary and text representations with automatic conversion
-   Checksum validation and calculation
-   Chain resolution via off-chain registries

## Architecture

The package follows a clean two-layer architecture:

1. **Address Layer (EIP-7930 + CAIP-350)**: Discriminated union address representation - either binary or text, but not both. Functions automatically convert between representations as needed. Synchronous encoding/decoding operations.

2. **Name Layer (ERC-7828)**: Human-readable names with ENS resolution. Async operations for resolution.

## Quick Start

```typescript
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

// Convert binary to text representation (synchronous)
const textFromBinary = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045", {
    representation: "text",
});
```

See the [Getting Started](./addresses/getting-started.md) guide for more details.
