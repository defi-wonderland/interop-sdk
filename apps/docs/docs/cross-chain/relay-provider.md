---
title: Relay Provider
---

The Relay Protocol provider enables cross-chain token transfers using the Relay bridge infrastructure.

**Status**: Active (mainnet + testnet)

## Configuration

| Field        | Type    | Required | Description                                   |
| ------------ | ------- | -------- | --------------------------------------------- |
| `baseUrl`    | string  | No       | Custom API base URL (overrides isTestnet)     |
| `isTestnet`  | boolean | No       | Use testnet API (default: false)              |
| `providerId` | string  | No       | Custom provider identifier (default: "relay") |
| `apiKey`     | string  | No       | Relay API key for authentication              |

Notes:

-   `baseUrl` overrides the URL derived from `isTestnet`.
-   When `apiKey` is provided, it is sent as the `x-api-key` header on all requests.

## Creating the Provider

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Relay config is optional - defaults to mainnet
// Mainnet: https://api.relay.link
// Testnet: https://api.testnets.relay.link
const relayProvider = createCrossChainProvider("relay", { isTestnet: true });

// With API key
const relayWithKey = createCrossChainProvider("relay", {
    apiKey: "your-api-key",
});
```

## Getting Quotes

```typescript
const quotes = await relayProvider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 11155111,
        assetAddress: "0xInputTokenAddress",
        amount: "1000000000000000000", // 1 token (in wei)
    },
    output: {
        chainId: 84532,
        assetAddress: "0xOutputTokenAddress",
        recipient: "0xRecipientAddress",
    },
    swapType: "exact-input",
});

const quote = quotes[0]; // Select the first quote
```

## Fees

After getting a quote, you can inspect the standardized fee breakdown via `quote.fees`:

```typescript
const quote = quotes[0];

console.log(quote.fees?.bridgeFee); // { amount, amountUsd, token }
console.log(quote.fees?.bridgeFeePct); // percentage (wei-encoded, 1e18 = 100%)
console.log(quote.fees?.originGas); // origin chain gas estimate
```

See the [API reference](./api.md#quotefees) for the full `QuoteFees` type.

## Executing Transactions

Access approval information from the order checks and execute the bridge transaction:

```typescript
import type { Address, Hex } from "viem";
import { getTransactionSteps } from "@wonderland/interop-cross-chain";

// Approve required token allowances
const allowances = quote.order.checks?.allowances ?? [];
for (const { spender, tokenAddress, required } of allowances) {
    // Approve token spend if needed
}

// Execute the bridge transaction
const step = getTransactionSteps(quote.order)[0];
await walletClient.sendTransaction({
    to: step.transaction.to as Address,
    data: step.transaction.data as Hex,
    value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
    gas: step.transaction.gas ? BigInt(step.transaction.gas) : undefined,
});
```

## Features

-   Cross-chain token transfers
-   Quote fetching with fee calculation
-   Transaction simulation
-   Order tracking support
-   API-based intent tracking
-   Automatic transaction notification for faster solver indexing via the pre-tracker

## Tracking

Relay tracking is fully API-based — it does not require RPC URLs. The SDK polls the Relay API (`/intents/status/v3`) at 5-second intervals until the order is finalized or fails.

To start tracking, you need two values:

-   **`orderId`** — found at `quote.tracking.orderId`. This is the identifier Relay uses to look up the order status.
-   **`openTxHash`** — the bridge transaction hash from the [execution step](#executing-transactions) (not the approval hash).

```typescript
const orderId = quote.tracking?.orderId;
const tracker = executor.prepareTracking("relay");

for await (const item of tracker.watchOrder({
    orderId,
    openTxHash: bridgeTxHash,
    originChainId: 11155111,
    destinationChainId: 84532,
})) {
    // Handle tracking updates
}
```

## Transaction Notification

Transaction notification is automatic — when tracking starts, the pre-tracker calls Relay's [transaction indexing](https://docs.relay.link/references/api/api_guides/transaction-indexing) via `POST /transactions/index`, accelerating the indexing process before transaction validation completes. No manual step is required.

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Relay Protocol Documentation](https://docs.relay.link/)
