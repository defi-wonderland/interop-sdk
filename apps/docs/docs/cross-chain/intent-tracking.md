---
title: Intent Tracking
---

The Intent Tracking system allows you to monitor cross-chain transfers from initiation to completion, following the EIP-7683 standard. This feature provides real-time status updates as intents progress through their lifecycle.

## Overview

The Intent Tracker monitors cross-chain transfers through their complete lifecycle:

1. **Opening** - Transaction submitted, waiting for confirmation
2. **Opened** - Open event detected on origin chain
3. **Filling** - Waiting for fill on destination chain
4. **Filled** - Transfer completed successfully
5. **Expired** - Transfer deadline exceeded

## Basic Usage

The recommended way to track intents is through the `ProviderExecutor`, which handles tracker creation and caching automatically:

```typescript
import {
    createCrossChainProvider,
    createProviderExecutor,
    IntentTrackerFactory,
} from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider(
    "across",
    { apiUrl: "https://testnet.across.to/api" },
    {},
);

const executor = createProviderExecutor({
    providers: [acrossProvider],
    trackerFactory: new IntentTrackerFactory({
        rpcUrls: {
            11155111: "https://sepolia.infura.io/v3/YOUR_API_KEY",
            84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
        },
    }),
});
```

### Tracking an Intent

After executing a transaction, use `executor.track()` for real-time updates:

```typescript
const quote = response.quotes[0];
const hash = await walletClient.sendTransaction(quote.preparedTransaction);

const tracker = executor.track({
    txHash: hash,
    providerId: quote.provider,
    originChainId: 11155111,
    destinationChainId: 84532,
    timeout: 300000, // 5 minutes
});

tracker.on("opening", (update) => console.log("Opening..."));
tracker.on("opened", (update) => console.log("Opened:", update.orderId));
tracker.on("filling", (update) => console.log("Waiting for fill..."));
tracker.on("filled", (update) => console.log("Filled!", update.fillTxHash));
tracker.on("expired", (update) => console.log("Transfer expired"));
tracker.on("error", (error) => console.error("Error:", error));
```

### Getting Current Status

Check the current status of an intent without watching:

```typescript
const status = await executor.getIntentStatus({
    txHash: "0xabc...",
    providerId: "across",
    originChainId: 11155111,
});

console.log(status.status); // 'opening' | 'opened' | 'filling' | 'filled' | 'expired'
console.log(status.orderId); // Order ID
console.log(status.inputAmount); // Input amount (bigint)
console.log(status.outputAmount); // Output amount (bigint)

if (status.fillEvent) {
    console.log(`Filled by: ${status.fillEvent.relayer}`);
    console.log(`Fill tx: ${status.fillEvent.fillTxHash}`);
}
```

## Intent Status Types

### Opening

The transaction has been submitted but the Open event hasn't been detected yet.

```typescript
{
    status: 'opening',
    message: 'Transaction submitted, waiting for confirmation...'
}
```

### Opened

The Open event has been detected on the origin chain. The intent is now waiting to be filled.

```typescript
{
    status: 'opened',
    orderId: '0x...',
    openTxHash: '0x...',
    timestamp: 1234567890,
    message: 'Intent opened with orderId 0x...'
}
```

### Filling

The intent is actively being filled on the destination chain.

```typescript
{
    status: 'filling',
    orderId: '0x...',
    openTxHash: '0x...',
    timestamp: 1234567890,
    message: 'Waiting for relayer to fill intent...'
}
```

### Filled

The transfer has been completed successfully.

```typescript
{
    status: 'filled',
    orderId: '0x...',
    openTxHash: '0x...',
    fillTxHash: '0xdef...',
    timestamp: 1234567890,
    message: 'Intent filled in block 12345'
}
```

### Expired

The transfer deadline has been exceeded.

```typescript
{
    status: 'expired',
    orderId: '0x...',
    openTxHash: '0x...',
    timestamp: 1234567890,
    message: 'Intent expired before fill'
}
```

## Advanced: Standalone Tracker

For advanced use cases, you can create a tracker directly without using the executor:

```typescript
import { createCrossChainProvider, createIntentTracker } from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider(
    "across",
    { apiUrl: "https://testnet.across.to/api" },
    {},
);

const tracker = createIntentTracker(acrossProvider, {
    rpcUrls: {
        11155111: "https://sepolia.infura.io/v3/YOUR_API_KEY",
        84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
    },
});
```

### Watching an Intent

Watch an intent with real-time updates using an async generator:

```typescript
for await (const update of tracker.watchIntent({
    txHash: "0xabc...",
    originChainId: 11155111,
    destinationChainId: 84532,
    timeout: 300000, // 5 minutes
})) {
    console.log(`Status: ${update.status}`);
    console.log(`Message: ${update.message}`);

    if (update.status === "filled") {
        console.log(`Filled in tx: ${update.fillTxHash}`);
        break;
    } else if (update.status === "expired") {
        console.log("Transfer expired");
        break;
    }
}
```

### Custom Public Client

You can also provide a custom viem PublicClient:

```typescript
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const publicClient = createPublicClient({
    chain: sepolia,
    transport: http("https://sepolia.infura.io/v3/YOUR_API_KEY"),
});

const tracker = createIntentTracker(acrossProvider, {
    publicClient,
});
```

## Error Handling

The Intent Tracker handles errors gracefully:

```typescript
try {
    for await (const update of tracker.watchIntent({
        txHash: "0x...",
        originChainId: 11155111,
        destinationChainId: 84532,
    })) {
        // Handle updates
    }
} catch (error) {
    if (error instanceof Error) {
        console.error("Tracking error:", error.message);
    }
}
```

## Best Practices

1. Always set an appropriate timeout for intent watching
2. Handle all status types appropriately in your UI
3. Use `getIntentStatus()` for one-time checks instead of watching
4. Provide custom RPC URLs for better reliability
5. Monitor for expired intents and handle them appropriately

## Next Step

Explore more complex scenarios: [Advanced Usage](./advanced-usage.md)

## References

-   [EIP-7683: Open Intent Framework](https://www.erc7683.org/)
-   [Intent Tracking Types](./api.md#intent-tracker)
