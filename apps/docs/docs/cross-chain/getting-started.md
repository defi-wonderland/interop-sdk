---
title: Getting Started
---

The `@interop-sdk/cross-chain` package provides a standardized interface for interacting with cross-chain bridges and protocols. It enables seamless token transfers and swaps between different blockchain networks through a unified API.

## Installation

```bash
npm install @interop-sdk/cross-chain
# or
yarn add @interop-sdk/cross-chain
# or
pnpm add @interop-sdk/cross-chain
```

## Key Features

-   Cross-chain token transfers between supported networks
-   Cross-chain token swaps with customizable slippage
-   Quote fetching for cross-chain operations
-   Standardized provider interface for integrating different bridge protocols
-   Type-safe interactions with comprehensive TypeScript support

## Basic Usage

### Creating a Provider

The package uses a factory pattern to create providers for different protocols. Currently supported protocols include:

-   Across Protocol
-   Sample Provider (for testing)

```typescript
import { createCrossChainProvider } from "@interop-sdk/cross-chain";

// Create an Across provider
const acrossProvider = createCrossChainProvider(
    "across",
    {
        userAddress: "0x...", // Your user address
    },
    {
        publicClient: publicClient, // Viem public client
    },
);

// Create a sample provider (for testing)
const sampleProvider = createCrossChainProvider("sample", {}, {});
```

### Getting Quotes

You can get quotes for cross-chain transfers and swaps:

```typescript
// Get a quote for a cross-chain transfer
const transferQuote = await provider.getQuote("crossChainTransfer", {
    inputChainId: "1", // Ethereum mainnet
    outputChainId: "137", // Polygon
    inputTokenAddress: "0x...", // Token address on source chain
    outputTokenAddress: "0x...", // Token address on destination chain
    inputAmount: "1000000000000000000", // 1 token (in wei)
});

// Get a quote for a cross-chain swap
const swapQuote = await provider.getQuote("crossChainSwap", {
    inputChainId: "1",
    outputChainId: "137",
    inputTokenAddress: "0x...",
    outputTokenAddress: "0x...",
    inputAmount: "1000000000000000000",
    outputAmount: "900000000000000000", // Expected output amount
});
```

### Executing Cross-Chain Operations

After getting a quote, you can simulate and execute the transaction:

```typescript
// Simulate the transaction
const transactions = await provider.simulateOpen(transferQuote.openParams);

// The transactions array contains the transaction requests that need to be executed
// You can use your preferred wallet or transaction library to send these transactions
```

## Advanced Usage

### Provider Executor

For more complex scenarios, you can use the ProviderExecutor to manage multiple providers:

```typescript
import { createProviderExecutor } from "@interop-sdk/cross-chain";

const executor = createProviderExecutor([acrossProvider, sampleProvider]);

// The executor can be used to get quotes from multiple providers
// and execute transactions across different protocols
```

### Error Handling

The package includes specific error types for better error handling:

```typescript
import {
    UnsupportedAction,
    UnsupportedChainId,
    UnsupportedProtocol,
} from "@interop-sdk/cross-chain";

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
