---
title: Advanced Usage
---

## Two-Layer Architecture

The package follows a clean two-layer architecture with a discriminated union type system:

### Address Layer (EIP-7930 + CAIP-350)

Discriminated union address representation (binary or text) - synchronous encoding/decoding:

```typescript
import {
    calculateChecksum,
    decodeAddress,
    encodeAddress,
    isBinaryAddress,
    isTextAddress,
    toBinaryRepresentation,
    toTextRepresentation,
    validateChecksum,
    validateInteroperableAddress,
} from "@wonderland/interop-addresses";

// Decode binary to text representation (default)
const textAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
// textAddr.chainType - "eip155" (string)
// textAddr.chainReference - "1" (string)
// textAddr.address - "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" (string)

// Decode binary to binary representation
const binaryAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045", {
    representation: "binary",
});
// binaryAddr.chainType - Uint8Array
// binaryAddr.chainReference - Uint8Array
// binaryAddr.address - Uint8Array

// Encode either representation to binary (auto-converts)
const hex = encodeAddress(textAddr, { format: "hex" });
const hex2 = encodeAddress(binaryAddr, { format: "hex" });

// Calculate checksum (accepts either representation)
const checksum = calculateChecksum(textAddr);
const checksum2 = calculateChecksum(binaryAddr);

// Validate address structure (accepts either representation)
const validated = validateInteroperableAddress(textAddr);

// Validate checksum (accepts either representation)
validateChecksum(textAddr, checksum);

// Convert between representations
const binaryFromText = toBinaryRepresentation(textAddr);
const textFromBinary = toTextRepresentation(binaryAddr);

// Use type guards to narrow types
if (isTextAddress(textAddr)) {
    console.log(textAddr.chainType); // TypeScript knows this is "eip155" | "solana"
}
if (isBinaryAddress(binaryAddr)) {
    console.log(binaryAddr.chainType); // TypeScript knows this is Uint8Array
}
```

### Name Layer (ERC-7828)

Human-readable names with ENS resolution - async operations:

```typescript
import {
    binaryToName,
    formatName,
    isTextAddress,
    nameToBinary,
    parseName,
} from "@wonderland/interop-addresses";

// Parse with full metadata (defaults to text representation)
const result = await parseName("vitalik.eth@eip155:1#4CA88C9C");
// result.name - original parsed components
// result.address - address in text representation (default)
//   - Use isTextAddress() to access text fields
//   - result.address.chainType - "eip155" (string)
//   - result.address.chainReference - "1" (string)
//   - result.address.address - "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" (string)
// result.meta.checksum - calculated checksum
// result.meta.isENS - whether address was ENS
// result.meta.isChainLabel - whether chain reference was a label

// Parse with binary representation
const resultBinary = await parseName("vitalik.eth@eip155:1#4CA88C9C", {
    representation: "binary",
});

// Format to name (accepts either representation, auto-converts, calculates checksum)
const name = formatName(result.address);

// Simple conversions
const binary = await nameToBinary("vitalik.eth@eip155:1#4CA88C9C", { format: "hex" });
const nameFromBinary = binaryToName("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
```

## Computing Checksums

Checksums are always calculated from the binary address, even if not provided:

```typescript
import { computeChecksum, parseName } from "@wonderland/interop-addresses";

// Compute checksum from name
const checksum = await computeChecksum("vitalik.eth@eip155:1");
// Returns: "4CA88C9C"

// Parse with checksum validation
const result = await parseName("vitalik.eth@eip155:1#4CA88C9C");
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
    resolveChain,
    shortnameToChainId,
} from "@wonderland/interop-addresses";

// Validate chain type
const isValid = isValidChainType("eip155"); // true

// Validate chain reference
const isValidChainRef = isValidChain("eip155", "1"); // true

// Resolve chain (handles shortname resolution, validation, etc.)
const resolved = await resolveChain({ chainReference: "eth" });
// Returns: { chainType: "eip155", chainReference: "1" }

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
    const result = await parseName("invalid.eth@eip155:1");
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
    calculateChecksum,
    decodeAddress,
    encodeAddress,
    formatName,
    isTextAddress,
    parseName,
} from "@wonderland/interop-addresses";

// Start with name
const name = "vitalik.eth@eip155:1#4CA88C9C";

// Parse to get text address (default)
const parsed = await parseName(name);
const textAddr = parsed.address;

// Verify it's text representation
if (!isTextAddress(textAddr)) {
    throw new Error("Expected text representation");
}

// Encode text address to binary
const binary = encodeAddress(textAddr, { format: "hex" });

// Decode binary back to text address
const textAddrFromBinary = decodeAddress(binary);

// Format back to name (checksum calculated automatically)
const nameFromText = formatName(textAddrFromBinary);
```

### Text → Binary → Text (Synchronous)

```typescript
import { decodeAddress, encodeAddress, isTextAddress } from "@wonderland/interop-addresses";

const textAddr = {
    version: 1,
    chainType: "eip155",
    chainReference: "1",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
};

// Convert to binary
const binary = encodeAddress(textAddr, { format: "hex" });

// Convert back to text
const textRoundTrip = decodeAddress(binary);
// textRoundTrip should equal textAddr (use isTextAddress to verify)
if (isTextAddress(textRoundTrip)) {
    console.log(textRoundTrip.chainType); // "eip155"
    console.log(textRoundTrip.chainReference); // "1"
    console.log(textRoundTrip.address); // "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
}
```

## Best Practices

1. **Use type guards for type safety**: Always use `isTextAddress()` or `isBinaryAddress()` to narrow the discriminated union before accessing fields.

2. **Default to text representation**: The default representation is "text" (more user-friendly). Use binary only when you need raw bytes.

3. **Automatic conversion**: Functions like `encodeAddress` and `formatName` accept either representation and convert automatically - no need to manually convert first.

4. **Always validate addresses**: Use validation methods before using addresses in production code.

5. **Handle checksum mismatches**: Check `result.meta.checksumMismatch` when parsing names to detect potential issues.

6. **Use individual functions for tree-shaking**: Import only what you need to minimize bundle size.

7. **Handle errors appropriately**: Use the provided error types for better error handling.

8. **Use ENS names for better UX**: ENS names provide a better user experience when available.

9. **Convert representations explicitly when needed**: Use `toBinaryRepresentation()` or `toTextRepresentation()` only when you need to change the representation type explicitly.
