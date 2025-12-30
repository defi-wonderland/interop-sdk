---
title: Advanced Usage
---

## Provider Executor

For complex scenarios, use the ProviderExecutor to manage multiple providers with sorting and timeout handling:

```typescript
import {
    createCrossChainProvider,
    createProviderExecutor,
    SortingStrategyFactory,
} from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider("across", {
    apiUrl: "https://testnet.across.to/api",
});

const executor = createProviderExecutor({
    providers: [acrossProvider],
    sortingStrategy: SortingStrategyFactory.createStrategy("bestOutput"),
    timeoutMs: 15000,
});

// Get quotes from all providers
const response = await executor.getQuotes({
    user: "0xYourAddress@eip155:11155111#CHECKSUM",
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: "0xYourAddress@eip155:11155111#CHECKSUM",
                asset: "0xInputToken@eip155:11155111#CHECKSUM",
                amount: "1000000000000000000",
            },
        ],
        outputs: [
            {
                receiver: "0xRecipient@eip155:84532#CHECKSUM",
                asset: "0xOutputToken@eip155:84532#CHECKSUM",
            },
        ],
        swapType: "exact-input",
    },
    supportedTypes: ["across"],
});

// Handle results
if (response.quotes.length > 0) {
    const bestQuote = response.quotes[0];
    console.log(`Best quote from ${bestQuote.provider}`);
}

response.errors.forEach((error) => {
    console.error(`Error: ${error.errorMsg}`);
});
```

For more details on the Provider Executor configuration, see the [API Reference](./api.md#provider-executor).

## Intent Tracking

Track cross-chain transfers from initiation to completion:

```typescript
import { createCrossChainProvider, createIntentTracker } from "@wonderland/interop-cross-chain";

// Create provider first
const acrossProvider = createCrossChainProvider("across", {
    apiUrl: "https://testnet.across.to/api",
});

// Create tracker from provider
const tracker = createIntentTracker(acrossProvider, {
    rpcUrls: {
        11155111: "https://sepolia.infura.io/v3/YOUR_API_KEY",
        84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
    },
});

// Watch an intent with real-time updates using async generator
for await (const update of tracker.watchIntent({
    txHash: "0x...",
    originChainId: 11155111,
    destinationChainId: 84532,
    timeout: 300000, // 5 minutes
})) {
    console.log(`[${update.status}] ${update.message}`);

    if (update.status === "filled") {
        console.log(`Filled in tx: ${update.fillTxHash}`);
        break;
    } else if (update.status === "expired") {
        console.log("Transfer expired");
        break;
    }
}

// Or get current status without watching
const status = await tracker.getIntentStatus("0x...", 11155111);
console.log(status.status); // 'opening' | 'opened' | 'filling' | 'filled' | 'expired'
if (status.fillEvent) {
    console.log(`Filled by: ${status.fillEvent.relayer}`);
}
```

### Event-Based Tracking

You can also use event-based tracking with `startTracking`:

```typescript
tracker.on("opening", (update) => console.log("Opening..."));
tracker.on("opened", (update) => console.log("Opened:", update.orderId));
tracker.on("filling", (update) => console.log("Waiting for fill..."));
tracker.on("filled", (update) => console.log("Filled!", update.fillTxHash));
tracker.on("expired", (update) => console.log("Expired"));
tracker.on("error", (error) => console.error("Error:", error));

const finalStatus = await tracker.startTracking({
    txHash: "0x...",
    originChainId: 11155111,
    destinationChainId: 84532,
    timeout: 300000,
});
```

For more details, see [Intent Tracking](./intent-tracking.md).

## Error Handling

The package includes specific error types for better error handling:

```typescript
import {
    ProviderGetQuoteFailure,
    ProviderNotFound,
    ProviderTimeout,
    UnsupportedAction,
    UnsupportedChainId,
    UnsupportedProtocol,
} from "@wonderland/interop-cross-chain";

try {
    const response = await executor.getQuotes({
        /* ... */
    });
} catch (error) {
    if (error instanceof UnsupportedProtocol) {
        console.error("Protocol not supported");
    } else if (error instanceof UnsupportedChainId) {
        console.error("Chain ID not supported");
    } else if (error instanceof ProviderNotFound) {
        console.error("Provider not found");
    } else if (error instanceof ProviderGetQuoteFailure) {
        console.error("Failed to get quote:", error.message);
    } else if (error instanceof ProviderTimeout) {
        console.error("Request timed out");
    }
}
```

## Best Practices

1. Always check both `quotes` and `errors` in the executor response
2. Use sorting strategies to get the best quotes first
3. Use Intent Tracker to monitor cross-chain transfers
4. Handle errors appropriately using the provided error types
5. Set appropriate timeouts for quote requests
6. Test your implementation on testnet before moving to production
7. Provide custom RPC URLs for better reliability

## Reference

For detailed method documentation, see the [API Reference](./api.md).
