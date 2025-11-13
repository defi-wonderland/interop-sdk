---
title: Advanced Usage
---

## Building from Payload

You can build an interop address from individual components:

```typescript
import { InteropAddressProvider } from "@defi-wonderland/interop";

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
import { InteropAddressProvider } from "@defi-wonderland/interop";

const checksum = await InteropAddressProvider.computeChecksum("alice.eth@eip155:1");
```

## Validation

The package provides methods to validate addresses:

```typescript
import { InteropAddressProvider } from "@defi-wonderland/interop";

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
import { InvalidAddress, UnsupportedChainType } from "@defi-wonderland/interop";

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
