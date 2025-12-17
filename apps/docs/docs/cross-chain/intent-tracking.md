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

## Installation

```bash
npm install @wonderland/interop-cross-chain
# or
yarn add @wonderland/interop-cross-chain
# or
pnpm add @wonderland/interop-cross-chain
```

## Basic Usage

### Creating an Intent Tracker

```typescript
import { createIntentTracker } from "@wonderland/interop-cross-chain";

// Create a tracker for Across protocol
const tracker = createIntentTracker("across");
```

### Watching an Intent

Watch an intent with real-time updates using an async generator:

```typescript
import { createIntentTracker } from "@wonderland/interop-cross-chain";

const tracker = createIntentTracker("across");

// Watch an intent with real-time updates
for await (const update of tracker.watchIntent({
    txHash: "0xabc...",
    originChainId: 11155111, // Sepolia
    destinationChainId: 84532, // Base Sepolia
    timeout: 300000, // 5 minutes (optional)
})) {
    console.log(`Status: ${update.status}`);
    console.log(`Message: ${update.message}`);
    
    if (update.status === 'filled') {
        console.log(`Filled in tx: ${update.fillTxHash}`);
        break;
    } else if (update.status === 'expired') {
        console.log("Transfer expired");
        break;
    }
}
```

### Getting Current Status

Check the current status of an intent without watching:

```typescript
import { createIntentTracker } from "@wonderland/interop-cross-chain";

const tracker = createIntentTracker("across");

// Get current status
const status = await tracker.getIntentStatus(
    "0xabc...", // transaction hash
    11155111    // origin chain ID
);

console.log(status.status); // 'opening' | 'opened' | 'filling' | 'filled' | 'expired'
console.log(status.depositInfo); // Deposit information if available

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
    message: 'Intent opened, waiting for fill...',
    depositInfo: {
        depositId: BigInt('123'),
        inputAmount: BigInt('1000000000000000000'),
        outputAmount: BigInt('990000000000000000'),
        destinationChainId: 84532
    }
}
```

### Filling

The intent is actively being filled on the destination chain.

```typescript
{
    status: 'filling',
    message: 'Intent is being filled...',
    depositInfo: { /* ... */ }
}
```

### Filled

The transfer has been completed successfully.

```typescript
{
    status: 'filled',
    message: 'Transfer completed successfully',
    fillEvent: {
        fillTxHash: '0xdef...',
        blockNumber: 12345n,
        timestamp: 1234567890,
        originChainId: 11155111,
        depositId: BigInt('123'),
        relayer: '0xrelayer...',
        recipient: '0xrecipient...'
    },
    depositInfo: { /* ... */ }
}
```

### Expired

The transfer deadline has been exceeded.

```typescript
{
    status: 'expired',
    message: 'Transfer deadline exceeded',
    depositInfo: { /* ... */ }
}
```

## Advanced Configuration

### Custom RPC URLs

You can provide custom RPC URLs for specific chains:

```typescript
const tracker = createIntentTracker("across", {
    rpcUrls: {
        11155111: "https://sepolia.infura.io/v3/YOUR_API_KEY",
        84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
    }
});
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

const tracker = createIntentTracker("across", {
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
3. Use `getIntentStatus` for one-time checks instead of watching
4. Provide custom RPC URLs for better reliability
5. Monitor for expired intents and handle them appropriately

## References

-   [EIP-7683: Open Intent Framework](https://www.erc7683.org/)
-   [Intent Tracking Types](./api.md#intent-tracker)

