---
title: Advanced Usage
---

## Three-Layer Architecture

The package follows a clean three-layer architecture:

### Binary Layer (EIP-7930)

Pure binary encoding/decoding - synchronous, no dependencies:

```typescript
import {
    calculateChecksum,
    decodeInteroperableAddress,
    encodeInteroperableAddress,
    validateChecksum,
    validateInteroperableAddress,
} from "@wonderland/interop-addresses";

// Decode binary address
const addr = decodeInteroperableAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");

// Encode to binary
const hex = encodeInteroperableAddress(addr, { format: "hex" });

// Calculate checksum
const checksum = calculateChecksum(addr);

// Validate address structure
const validated = validateInteroperableAddress(addr);

// Validate checksum
validateChecksum(addr, checksum);
```

### Text Layer (CAIP-350)

Structured objects with fields using CAIP-350 text serialization rules (per chainType) - synchronous conversion:

```typescript
import { binaryToText, textToBinary, toBinary, toText } from "@wonderland/interop-addresses";

// Convert binary to structured object with CAIP-350 text-encoded fields
const addr = decodeInteroperableAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
const text = toText(addr);
// Returns: { version: 1, chainType: "eip155", chainReference: "1", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" }
// Fields use CAIP-350 encoding rules (per chainType): for eip155, chainReference as decimal string, address as hex with EIP-55 checksum

// Convert structured object with CAIP-350 text-encoded fields to binary
const binary = toBinary(text);

// Or use convenience methods
const binaryFromText = textToBinary(text, { format: "hex" });
const textFromBinary = binaryToText("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
```

### Name Layer (ERC-7828)

Human-readable names with ENS resolution - async operations:

```typescript
import {
    binaryToName,
    formatInteroperableName,
    nameToBinary,
    parseInteroperableName,
} from "@wonderland/interop-addresses";

// Parse with full metadata
const result = await parseInteroperableName("vitalik.eth@eip155:1#4CA88C9C");
// result.name - original parsed components
// result.text - structured object with CAIP-350 text-encoded fields
// result.address - binary address
// result.meta.checksum - calculated checksum
// result.meta.isENS - whether address was ENS
// result.meta.isChainLabel - whether chain reference was a label

// Format text to name
const name = formatInteroperableName(result.text, result.meta.checksum);

// Simple conversions
const binary = await nameToBinary("vitalik.eth@eip155:1#4CA88C9C", { format: "hex" });
const nameFromBinary = binaryToName("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
```

## Computing Checksums

Checksums are always calculated from the binary address, even if not provided:

```typescript
import { computeChecksum, parseInteroperableName } from "@wonderland/interop-addresses";

// Compute checksum from name
const checksum = await computeChecksum("vitalik.eth@eip155:1");
// Returns: "4CA88C9C"

// Parse with checksum validation
const result = await parseInteroperableName("vitalik.eth@eip155:1#4CA88C9C");
// result.meta.checksum - always calculated
// result.meta.checksumMismatch - present if provided checksum didn't match
```

## Validation

The package provides methods to validate addresses:

```typescript
import {
    isValidBinaryAddress,
    isValidInteropAddress,
    isValidInteroperableName,
} from "@wonderland/interop-addresses";

// Validate any interop address (binary or name)
const isValid = await isValidInteropAddress("vitalik.eth@eip155:1#4CA88C9C", {
    validateChecksumFlag: true,
});

// Validate specifically interoperable names
const isValidName = await isValidInteroperableName("vitalik.eth@eip155:1#4CA88C9C", {
    validateChecksumFlag: true,
});

// Validate binary addresses (synchronous)
const isValidBinary = isValidBinaryAddress(
    "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045",
);
```

## Working with Chain References

```typescript
import {
    isValidChain,
    isValidChainType,
    resolveChainReference,
    shortnameToChainId,
} from "@wonderland/interop-addresses";

// Validate chain type
const isValid = isValidChainType("eip155"); // true

// Validate chain reference
const isValidChainRef = isValidChain("eip155", "1"); // true

// Resolve chain reference (shortname to chain type + reference)
const resolved = await resolveChainReference("eth");
// Returns: { chainType: "eip155", chainReference: "1" } or null

// Resolve shortname to chain ID
const chainId = await shortnameToChainId("eth");
// Returns: 1 or undefined
```

## Error Handling

The package includes specific error types for better error handling:

```typescript
import {
    ENSLookupFailed,
    ENSNotFound,
    InvalidAddress,
    InvalidChainNamespace,
    InvalidInteroperableName,
    UnsupportedChainType,
} from "@wonderland/interop-addresses";

try {
    const result = await parseInteroperableName("invalid.eth@eip155:1");
} catch (error) {
    if (error instanceof InvalidAddress) {
        // Handle invalid address error
    } else if (error instanceof UnsupportedChainType) {
        // Handle unsupported chain type error
    } else if (error instanceof ENSNotFound) {
        // Handle ENS name not found
    } else if (error instanceof ENSLookupFailed) {
        // Handle ENS lookup failure
    } else if (error instanceof InvalidInteroperableName) {
        // Handle invalid interoperable name format
    } else if (error instanceof InvalidChainNamespace) {
        // Handle invalid chain namespace
    }
}
```

## Round-Trip Conversions

### Name → Text → Binary → Text → Name

```typescript
import {
    binaryToText,
    calculateChecksum,
    formatInteroperableName,
    parseInteroperableName,
    textToBinary,
} from "@wonderland/interop-addresses";

// Start with name
const name = "vitalik.eth@eip155:1#4CA88C9C";

// Parse to get text and binary
const parsed = await parseInteroperableName(name);
const text = parsed.text;
const binary = parsed.address;

// Convert binary back to text
const textFromBinary = binaryToText(encodeInteroperableAddress(binary, { format: "hex" }));

// Convert text back to binary
const binaryFromText = textToBinary(textFromBinary);

// Format back to name
const checksum = calculateChecksum(binaryFromText);
const nameFromText = formatInteroperableName(textFromBinary, checksum);
```

### Text → Binary → Text (Synchronous)

```typescript
import { binaryToText, textToBinary } from "@wonderland/interop-addresses";

const text = {
    version: 1,
    chainType: "eip155",
    chainReference: "1",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
};

// Convert to binary
const binary = textToBinary(text, { format: "hex" });

// Convert back to text
const textRoundTrip = binaryToText(binary);
// textRoundTrip should equal text
```

## Best Practices

1. **Use synchronous methods when possible**: If you already have structured data with CAIP-350 text-encoded fields (per chainType), use `textToBinary` instead of `nameToBinary` to avoid async overhead.

2. **Always validate addresses**: Use validation methods before using addresses in production code.

3. **Handle checksum mismatches**: Check `result.meta.checksumMismatch` when parsing names to detect potential issues.

4. **Use individual functions for tree-shaking**: Import only what you need to minimize bundle size.

5. **Handle errors appropriately**: Use the provided error types for better error handling.

6. **Use ENS names for better UX**: ENS names provide a better user experience when available.

7. **Consider layer separation**: Use the binary layer for performance-critical paths, text layer for structured data, and name layer when you need resolution.
