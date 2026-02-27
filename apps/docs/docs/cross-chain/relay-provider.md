---
title: Relay Provider
---

The Relay provider enables cross-chain token transfers and swaps using the [Relay](https://relay.link) bridge infrastructure.

**Status**: POC

## Configuration

| Field        | Type    | Required | Description                                        |
| ------------ | ------- | -------- | -------------------------------------------------- |
| `isTestnet`  | boolean | No       | Use testnet API (default: false)                   |
| `apiUrl`     | string  | No       | Custom API endpoint URL (overrides isTestnet)      |
| `apiKey`     | string  | No       | Relay API key for authenticated requests           |
| `source`     | string  | No       | Source identifier sent via `x-relay-source` header |
| `providerId` | string  | No       | Custom provider identifier                         |

Notes:

-   Default API URLs: mainnet `https://api.relay.link`, testnet `https://api.testnets.relay.link`
-   `apiUrl` overrides both `isTestnet` and the default URL

## Creating the Provider

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Relay config is optional - defaults to mainnet
const relayProvider = createCrossChainProvider("relay");

// With testnet config
const testnetProvider = createCrossChainProvider("relay", { isTestnet: true });

// With API key and source
const authedProvider = createCrossChainProvider("relay", {
    apiKey: "your-api-key",
    source: "my-app",
});
```

## Getting Quotes

Use the `ProviderExecutor` for SDK-friendly types with readable addresses:

```typescript
import { createProviderExecutor } from "@wonderland/interop-cross-chain";

const executor = createProviderExecutor({ providers: [relayProvider] });

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
});

const quote = response.quotes[0];
```

## Executing Transactions

This integration returns **transaction steps** — send the transaction directly:

```typescript
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";

const walletClient = createWalletClient({
    chain: mainnet,
    transport: http(),
    account: yourAccount,
});

// Relay may return multi-step orders (e.g. approve + deposit)
// Execute steps sequentially
// NOTE: In production, validate step.transaction.to against trusted contract
// addresses before sending to protect against compromised API responses.
for (const step of quote.order.steps) {
    if (step.kind === "transaction") {
        const hash = await walletClient.sendTransaction({
            to: step.transaction.to,
            data: step.transaction.data,
            ...(step.transaction.value && { value: BigInt(step.transaction.value) }),
        });
        console.log("Transaction sent:", hash);
    }
}
```

## Tracking

Relay orders are tracked by `requestId` (returned in quote metadata), not by transaction hash:

```typescript
const quote = response.quotes[0];
const requestId = quote.metadata?.requestId;

// Track using orderId (requestId from the quote)
const tracker = executor.prepareTracking(quote.provider);
const status = await tracker.track({
    orderId: requestId,
    originChainId: 1,
    destinationChainId: 8453,
});
```

Tracking polls `GET /intents/status/v3?requestId=<requestId>` with a 5-second interval.

### Status Mapping

| Relay Status | SDK Status  |
| ------------ | ----------- |
| `success`    | `Finalized` |
| `failure`    | `Failed`    |
| `refunded`   | `Refunded`  |
| `refund`     | `Refunded`  |
| All others   | `Pending`   |

## Features

-   Cross-chain token transfers and swaps
-   Quote fetching with fee details
-   Multi-step order support (approve + deposit)
-   Order tracking via requestId polling
-   Configurable API key and source headers

## Current Limitations (POC)

-   **Transaction-only**: Relay supports signature flows (e.g. permits), but this integration only handles transaction-based intents. Quotes with signature steps are excluded for now.
-   **No asset discovery**: `getDiscoveryConfig()` returns `null`
-   **No payload validation**: Calldata from the API is not validated against intent

## References

-   [Relay Documentation](https://docs.relay.link/)
-   [Relay API Reference](https://docs.relay.link/references/api)
