---
title: Getting Started
---

The `cross-chain` package provides a standardized interface for interacting with cross-chain bridges and protocols. It enables seamless token transfers and swaps between different blockchain networks through a unified API.

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
-   OIF (Open Intents Framework)

```typescript
import { createCrossChainProvider, createOifProvider } from "@wonderland/interop";

// Create an Across provider (no config or dependencies needed)
const acrossProvider = createCrossChainProvider("across");

// Create a sample provider (for testing)
const sampleProvider = createCrossChainProvider("sample-protocol");

// Create an OIF provider (requires solver API endpoint)
const oifProvider = createOifProvider({
    solverId: "my-solver",
    url: "https://oif-api.example.com",
});
```

### Getting Quotes

You can get quotes for cross-chain transfers and swaps:

```typescript
// Get a quote for a cross-chain transfer
const transferQuote = await acrossProvider.getQuote("crossChainTransfer", {
    inputChainId: "1", // Ethereum mainnet
    outputChainId: "137", // Polygon
    inputTokenAddress: "0x...", // Token address on source chain
    outputTokenAddress: "0x...", // Token address on destination chain
    inputAmount: "1000000000000000000", // 1 token (in wei)
});

// Get a quote for a cross-chain swap
const swapQuote = await acrossProvider.getQuote("crossChainSwap", {
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
const transactions = await acrossProvider.simulateOpen(transferQuote.openParams);

// The transactions array contains the transaction requests that need to be executed
// You can use your preferred wallet or transaction library to send these transactions
```

## OIF Provider

The OIF (Open Intents Framework) provider enables direct integration with any OIF-compliant solver. If you have access to a solver's API endpoint, you can integrate cross-chain functionality directly into your application using this provider.

The provider offers intent-based cross-chain operations with two execution modes:

### Protocol Mode (Gasless)

User signs EIP-712 message, solver executes on their behalf:

```typescript
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";

const quotes = await oifProvider.getQuotes({
    user: "0x123abc...",
    intent: {
        intentType: "oif-swap",
        inputs: [{ asset: "0x...", amount: "1000000" }],
        outputs: [{ asset: "0x...", amount: "990000" }],
        swapType: "exact-input",
    },
    supportedTypes: ["oif-escrow-v0"],
});

const walletClient = createWalletClient({ account, chain: base, transport: http() });
const { domain, primaryType, message, types } = quotes[0].order.payload;
const signature = await walletClient.signTypedData({ domain, primaryType, message, types });
await oifProvider.submitSignedOrder(quotes[0], signature);
```

### User Mode (User Pays Gas)

User executes transaction directly:

```typescript
const quotes = await oifProvider.getQuotes({
    user: "0x123abc...",
    intent: {
        intentType: "oif-swap",
        inputs: [{ asset: "0x...", amount: "1000000" }],
        outputs: [{ asset: "0x...", amount: "990000" }],
        originSubmission: { mode: "user" },
    },
    supportedTypes: ["oif-user-open-v0"],
});

await oifProvider.prepareTransaction(quotes[0]);
if (quotes[0].preparedTransaction) {
    await walletClient.sendTransaction(quotes[0].preparedTransaction);
}
```

### Approvals

Access approval information from quotes:

```typescript
// Protocol mode - typically Permit2
const spender = quote.order.payload.message.spender;

// User mode
const { spender, token, required } = quote.order.checks.allowances[0];
```
