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

## Executing Transactions

Relay quotes contain transaction steps. After getting a quote, execute the transaction:

```typescript
import { getTransactionSteps } from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(),
    account: yourAccount,
});

const step = getTransactionSteps(quote.order)[0];
const hash = await walletClient.sendTransaction({
    to: step.transaction.to,
    data: step.transaction.data,
    value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
});
console.log("Transaction sent:", hash);

// Notify Relay for faster solver indexing (calls POST /transactions/index)
await relayProvider.notifyDeposit(hash, 11155111);
```

## Features

-   Cross-chain token transfers
-   Quote fetching with fee calculation
-   Transaction simulation
-   Order tracking support
-   API-based intent tracking
-   Transaction notification for faster solver indexing

## Tracking

Relay tracking is fully API-based. Both opened intent parsing and fill watching use the `/intents/status/v3` endpoint.

-   **Opened intent parsing**: Fetches intent status from `/intents/status/v3?requestId=<txHash>`
-   **Fill watching**: Polls `/intents/status/v3?requestId=<orderId>` at 5-second intervals with automatic retry

Unlike Across, Relay does not require RPC URLs for tracking since all tracking is done through the Relay API.

## Transaction Notification

Relay supports `notifyDeposit` for faster solver indexing. After submitting a transaction, calling `notifyDeposit` triggers Relay's [transaction indexing](https://docs.relay.link/references/api/api_guides/transaction-indexing) via `POST /transactions/index`, accelerating the indexing process before transaction validation completes. This allows solvers to detect and fill the intent faster.

```typescript
const hash = await walletClient.sendTransaction({ ... });

// Notify Relay for faster indexing — call immediately after submission
await relayProvider.notifyDeposit(hash, 11155111);

// Or via the aggregator
await aggregator.notifyDeposit(quote.provider, hash, 11155111);
```

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Relay Protocol Documentation](https://docs.relay.link/)
