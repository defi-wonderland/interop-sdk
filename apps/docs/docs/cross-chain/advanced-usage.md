---
title: Advanced Usage
---

## Provider Executor

For more complex scenarios, you can use the ProviderExecutor to manage multiple providers:

```typescript
import { createProviderExecutor } from "@defi-wonderland/interop";

const executor = createProviderExecutor([acrossProvider, sampleProvider]);

// The executor can be used to get quotes from multiple providers
// and execute transactions across different protocols
```

## Error Handling

The package includes specific error types for better error handling:

```typescript
import {
    UnsupportedAction,
    UnsupportedChainId,
    UnsupportedProtocol,
} from "@defi-wonderland/interop";

try {
    // Your cross-chain operations here
} catch (error) {
    if (error instanceof UnsupportedProtocol) {
        // Handle unsupported protocol error
    } else if (error instanceof UnsupportedAction) {
        // Handle unsupported action error
    } else if (error instanceof UnsupportedChainId) {
        // Handle unsupported chain ID error
    }
}
```

## Best Practices

1. Always validate quotes before executing transactions
2. Use the appropriate provider for your use case
3. Handle errors appropriately using the provided error types
4. Consider using the ProviderExecutor for complex scenarios
5. Test your implementation using the sample provider before moving to production

## Supported Actions

The package supports two main actions:

1. `crossChainTransfer`: Transfer tokens between different chains
2. `crossChainSwap`: Swap tokens between different chains
