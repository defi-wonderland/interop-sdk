---
title: Advanced Usage
---

## Building from Payload

You can build an interop address from individual components:

```typescript
import { InteropAddressProvider } from "@wonderland/interop";

const payload = {
    version: 1,
    chainType: "eip155",
    chainReference: "0x1",
    address: "0x1",
};
const interopAddress = InteropAddressProvider.buildFromPayload(payload);
```

## Computing Checksums

```typescript
import { InteropAddressProvider } from "@wonderland/interop";

const checksum = await InteropAddressProvider.computeChecksum("alice.eth@eip155:1");
```

## Validation

The package provides methods to validate addresses:

```typescript
import { InteropAddressProvider } from "@wonderland/interop";

// Validate any interop address
const isValid = await InteropAddressProvider.isValidInteropAddress("alice.eth@eip155:1#ABCD1234", {
    validateChecksumFlag: true,
});

// Validate specifically human-readable addresses
const isValidHumanReadable = await InteropAddressProvider.isValidHumanReadableAddress(
    "alice.eth@eip155:1#ABCD1234",
    { validateChecksumFlag: true },
);

// Validate binary addresses
const isValidBinary = InteropAddressProvider.isValidBinaryAddress(
    "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045"
);
```

## Error Handling

The package includes specific error types for better error handling:

```typescript
import { 
    InvalidAddress, 
    UnsupportedChainType,
    ENSNotFound,
    ENSLookupFailed 
} from "@wonderland/interop-addresses";

try {
    // Your address operations here
} catch (error) {
    if (error instanceof InvalidAddress) {
        // Handle invalid address error
    } else if (error instanceof UnsupportedChainType) {
        // Handle unsupported chain type error
    } else if (error instanceof ENSNotFound) {
        // Handle ENS name not found
    } else if (error instanceof ENSLookupFailed) {
        // Handle ENS lookup failure
    }
}
```

## Best Practices

1. Always validate addresses before using them in production
2. Use the checksum validation when working with human-readable addresses
3. Consider using the individual functions for better tree-shaking
4. Handle errors appropriately using the provided error types
5. Use ENS names for better user experience when available
