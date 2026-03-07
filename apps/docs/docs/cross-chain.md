---
title: Cross-chain
---

The cross-chain package provides a standardized interface for interacting with cross-chain bridges and protocols. It enables seamless token transfers and swaps between different blockchain networks through a unified API.

## Features

-   Cross-chain token transfers between supported networks
-   Quote fetching and comparison from multiple providers
-   Intent tracking from initiation to completion
-   Support for OIF (Open Intents Framework) and Across Protocol
-   EIP-7683 compliant intent-based architecture

## Quick Start

```typescript
import {
    createCrossChainProvider,
    getSignatureSteps,
    getTransactionSteps,
    isSignatureOnlyOrder,
} from "@wonderland/interop-cross-chain";

// Create an OIF provider
const provider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://oif-api.example.com",
});

// Get quotes for a cross-chain transfer
const quotes = await provider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 1,
        assetAddress: "0xInputTokenAddress",
        amount: "1000000000000000000",
    },
    output: {
        chainId: 42161,
        assetAddress: "0xOutputTokenAddress",
        recipient: "0xRecipientAddress",
    },
    swapType: "exact-input",
});

const quote = quotes[0];

if (isSignatureOnlyOrder(quote.order)) {
    // Protocol mode: sign EIP-712 typed data (gasless for user)
    const step = getSignatureSteps(quote.order)[0];
    const signature = await walletClient.signTypedData(step.signaturePayload);
    await provider.submitOrder(quote, signature);
} else {
    // User mode: send transaction directly
    const step = getTransactionSteps(quote.order)[0];
    await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
    });
}
```

For Across Protocol integration, see the [Across Provider](./cross-chain/across-provider.md) guide.

See the [Getting Started](./cross-chain/getting-started.md) guide for more details.
