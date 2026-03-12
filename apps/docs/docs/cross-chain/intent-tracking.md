---
title: Order Tracking
---

The SDK includes **order tracking** to monitor cross-chain transfers from initiation to completion.

Tracking supports **two ways of observing the same lifecycle**, depending on the provider and how the order is created:

-   **Onchain tracking**: derive tracking data from the origin transaction (e.g. ERC-7683 open event), then watch the fill on the destination chain.
-   **Offchain tracking**: query a provider API for order state transitions (e.g. polling an "order status / deposit status" endpoint).

## Overview

The `OrderTracker` streams updates using the full OIF `OrderStatus` set (see the OIF Order API docs for the canonical list). Depending on the provider, you may observe statuses such as:

-   **Created**
-   **Pending**
-   **Executing**
-   **Executed**
-   **Settling**
-   **Settled**
-   **Finalized**
-   **Failed**
-   **Refunded**

In other words, you can subscribe to **any** `OrderStatus` via `tracker.on(OrderStatus.<status>, ...)` --- the examples below just show the most common ones.

In addition, the tracker can emit:

-   `Timeout` - the SDK stopped watching (the order may still finalize before its onchain deadline)
-   `Error` - an unexpected error occurred

## Basic Usage

The recommended way to track orders is through the `Aggregator`, which handles tracker creation and caching automatically:

```typescript
import {
    createAggregator,
    createCrossChainProvider,
    OrderTrackerFactory,
} from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider("across", { isTestnet: true });

const aggregator = createAggregator({
    providers: [acrossProvider],
    trackerFactory: new OrderTrackerFactory({
        rpcUrls: {
            11155111: "https://sepolia.infura.io/v3/YOUR_API_KEY",
            84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
        },
    }),
});
```

### Tracking an Order

After sending the transaction, use `aggregator.track()` for real-time updates:

```typescript
import {
    getTransactionSteps,
    OrderStatus,
    OrderTrackerEvent,
} from "@wonderland/interop-cross-chain";

const quote = response.quotes[0];
const step = getTransactionSteps(quote.order)[0];
const hash = await walletClient.sendTransaction({
    to: step.transaction.to,
    data: step.transaction.data,
    value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
});

const tracker = aggregator.track({
    txHash: hash,
    providerId: quote.provider,
    originChainId: 11155111,
    destinationChainId: 84532,
    timeout: 300000, // 5 minutes
});

tracker.on(OrderStatus.Pending, (update) => console.log("Pending:", update.message));
tracker.on(OrderStatus.Finalized, (update) => console.log("Finalized!", update.fillTxHash));
tracker.on(OrderStatus.Failed, (update) => console.log("Failed:", update.failureReason));
tracker.on(OrderStatus.Refunded, () => console.log("Refunded"));
tracker.on(OrderTrackerEvent.Timeout, (payload) => console.log("Timeout:", payload.message));
tracker.on(OrderTrackerEvent.Error, (error) => console.error("Error:", error));
```

### Getting Current Status

Check the current status of an order without watching:

```typescript
const status = await aggregator.getOrderStatus({
    txHash: "0xabc...",
    providerId: "across",
    originChainId: 11155111,
});

console.log(status.status); // OrderStatus
console.log(status.orderId); // Order ID

if (status.fillEvent) {
    console.log(`Filled by: ${status.fillEvent.relayer}`);
    console.log(`Fill tx: ${status.fillEvent.fillTxHash}`);
}
```

## Provider Notes (Across)

-   **Mainnet**: Across uses **API-based fill tracking** by default (polls `GET /deposit/status?depositTxnRef=...`). This reduces reliance on destination-chain RPCs.
-   **Testnet**: Across uses **event-based fill tracking** by default (Across testnet API is not reliable), so you should provide RPC URLs for both origin and destination chains.

## Provider Notes (Relay)

-   Relay uses **API-based tracking** for both mainnet and testnet. Both opened intent parsing and fill watching use the `/intents/status/v3` endpoint.
-   **No RPC URLs required** — all tracking is done through the Relay API.
-   Relay supports **transaction notification** via `notifyDeposit` to accelerate solver indexing. Call it immediately after submitting the transaction:

```typescript
const hash = await walletClient.sendTransaction({ ... });

// Notify Relay for faster indexing (calls POST /transactions/index)
await aggregator.notifyDeposit(quote.provider, hash, 11155111);

// Then start tracking as usual
const tracker = aggregator.track({
    txHash: hash,
    providerId: quote.provider,
    originChainId: 11155111,
    destinationChainId: 84532,
});
```

## Advanced: Standalone Tracker

For advanced use cases, you can create a tracker directly without using the aggregator:

```typescript
import { createCrossChainProvider, createOrderTracker } from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider("across", { isTestnet: true });

const tracker = createOrderTracker(acrossProvider, {
    rpcUrls: {
        11155111: "https://sepolia.infura.io/v3/YOUR_API_KEY",
        84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
    },
});
```

### Watching an Order

Watch an order with real-time updates using an async generator:

```typescript
import { OrderStatus, OrderTrackerYieldType } from "@wonderland/interop-cross-chain";

for await (const item of tracker.watchOrder({
    txHash: "0xabc...",
    originChainId: 11155111,
    destinationChainId: 84532,
    timeout: 300000, // 5 minutes
})) {
    if (item.type === OrderTrackerYieldType.Timeout) {
        console.log(`Timeout: ${item.payload.message}`);
        break;
    }

    console.log(`Status: ${item.update.status}`);
    console.log(`Message: ${item.update.message}`);

    if (item.update.status === OrderStatus.Finalized) {
        console.log(`Filled in tx: ${item.update.fillTxHash}`);
        break;
    } else if (item.update.status === OrderStatus.Failed) {
        console.log("Order failed");
        break;
    }
}
```

### Custom Public Client

You can also provide a custom viem PublicClient:

```typescript
import { createOrderTracker } from "@wonderland/interop-cross-chain";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const publicClient = createPublicClient({
    chain: sepolia,
    transport: http("https://sepolia.infura.io/v3/YOUR_API_KEY"),
});

const tracker = createOrderTracker(acrossProvider, {
    publicClient,
});
```

## Error Handling

The tracker handles errors gracefully:

```typescript
import { OrderTrackerYieldType } from "@wonderland/interop-cross-chain";

try {
    for await (const item of tracker.watchOrder({
        txHash: "0x...",
        originChainId: 11155111,
        destinationChainId: 84532,
    })) {
        if (item.type === OrderTrackerYieldType.Timeout) {
            // SDK stopped watching; order may still finalize before onchain deadline
            break;
        }

        // Handle item.update
    }
} catch (error) {
    if (error instanceof Error) {
        console.error("Tracking error:", error.message);
    }
}
```

## Best Practices

1. Always set an appropriate timeout for watching
2. Handle all `OrderStatus` updates appropriately in your UI
3. Use `getOrderStatus()` for one-time checks instead of watching
4. Provide custom RPC URLs for better reliability (origin chain always; destination chain for event-based fill tracking)
5. Treat `timeout` as non-terminal (the order can still finalize onchain)

## Next Step

Explore more complex scenarios: [Advanced Usage](./advanced-usage.md)

## References

-   [EIP-7683: Open Intent Framework](https://www.erc7683.org/)
-   [Order Tracking Types](./api.md#order-tracker)
