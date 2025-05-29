---
title: Getting Started
---

The `@interop-sdk/addresses` package provides a robust solution for handling interoperable blockchain addresses across different networks, following the [ERC-7930](https://ethereum-magicians.org/t/erc-7930-interoperable-addresses/23365) standard. This guide will help you get started with using the package in your projects.

## Installation

```bash
npm install @interop-sdk/addresses
# or
yarn add @interop-sdk/addresses
# or
pnpm add @interop-sdk/addresses
```

## Basic Usage

The package provides two main ways to work with addresses:

1. Using the `InteropAddressProvider` class
2. Using individual utility functions

### Using InteropAddressProvider

```typescript
import { InteropAddressProvider } from "@interop-sdk/addresses";

// Convert a human-readable address to binary format
const humanReadableAddress = "alice.eth@eip155:1#ABCD1234";
const binaryAddress = InteropAddressProvider.humanReadableToBinary(humanReadableAddress);

// Convert a binary address back to human-readable format
const humanReadable = InteropAddressProvider.binaryToHumanReadable(binaryAddress);

// Extract chain ID from a binary address
const chainId = InteropAddressProvider.getChainId(binaryAddress);

// Extract the address component from a binary address
const address = InteropAddressProvider.getAddress(binaryAddress);
```

### Using Individual Functions

For better tree-shaking and modularity, you can import individual functions:

```typescript
import {
    binaryToHumanReadable,
    getAddress,
    getChainId,
    humanReadableToBinary,
} from "@interop-sdk/addresses";

const humanReadableAddress = "alice.eth@eip155:1#ABCD1234";
const binaryAddress = humanReadableToBinary(humanReadableAddress);
```

## Address Format

The package supports two main address formats:

1. **Human-Readable Format**: `{address}@{chainType}:{chainReference}#{checksum}`
   Example: `alice.eth@eip155:1#ABCD1234`

2. **Binary Format**: ERC-7930 compliant representation of the address

## Supported Chain Types

Currently, the package supports the following chain types:

-   `eip155`: Ethereum and EVM-compatible chains
-   `solana`: Solana blockchain

## Advanced Usage

### Building from Payload

You can build an interop address from individual components:

```typescript
import { InteropAddressProvider } from "@interop-sdk/addresses";

const payload = {
    version: 1,
    chainType: "eip155",
    chainReference: "0x1",
    address: "0x1",
};
const interopAddress = InteropAddressProvider.buildFromPayload(payload);
```

### Computing Checksums

```typescript
import { InteropAddressProvider } from "@interop-sdk/addresses";

const checksum = await InteropAddressProvider.computeChecksum("alice.eth@eip155:1");
```

### Validation

The package provides methods to validate addresses:

```typescript
import { InteropAddressProvider } from "@interop-sdk/addresses";

// Validate any interop address
const isValid = await InteropAddressProvider.isValidInteropAddress("alice.eth@eip155:1#ABCD1234", {
    validateChecksumFlag: true,
});

// Validate specifically human-readable addresses
const isValidHumanReadable = await InteropAddressProvider.isValidHumanReadableAddress(
    "alice.eth@eip155:1#ABCD1234",
    { validateChecksumFlag: true },
);
```

## Error Handling

The package includes specific error types for better error handling:

```typescript
import { InvalidAddress, UnsupportedChainType } from "@interop-sdk/addresses";

try {
    // Your address operations here
} catch (error) {
    if (error instanceof InvalidAddress) {
        // Handle invalid address error
    } else if (error instanceof UnsupportedChainType) {
        // Handle unsupported chain type error
    }
}
```

## Best Practices

1. Always validate addresses before using them in production
2. Use the checksum validation when working with human-readable addresses
3. Consider using the individual functions for better tree-shaking
4. Handle errors appropriately using the provided error types

## References

-   [ERC-7930: Interoperable Addresses](https://ethereum-magicians.org/t/erc-7930-interoperable-addresses/23365)
-   [Package Documentation](./api/addresses)
