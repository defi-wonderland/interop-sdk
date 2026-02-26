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
import { createCrossChainProvider, createProviderExecutor } from "@wonderland/interop-cross-chain";

// Create an OIF provider
const provider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://oif-api.example.com",
});

const executor = createProviderExecutor({ providers: [provider] });

// Get quotes for a cross-chain transfer
const response = await executor.getQuotes({
    user: { chainId: 1, address: "0xYourAddress..." },
    intent: {
        inputs: [
            {
                asset: { chainId: 1, address: "0xInputToken..." },
                amount: "1000000000000000000",
            },
        ],
        outputs: [
            {
                asset: { chainId: 8453, address: "0xOutputToken..." },
            },
        ],
        swapType: "exact-input",
    },
    supportedLocks: ["oif-escrow"],
});

const quote = response.quotes[0];
```

For Across Protocol integration, see the [Across Provider](./cross-chain/across-provider.md) guide.

See the [Getting Started](./cross-chain/getting-started.md) guide for more details.
