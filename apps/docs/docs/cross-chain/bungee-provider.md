---
title: Bungee Provider
---

The Bungee Protocol provider enables cross-chain token transfers using the Bungee bridge infrastructure, supporting both gasless permit2 flows (ERC20) and standard transactions (native ETH).

**Status**: Active (mainnet)

## Configuration

| Field        | Type   | Required | Description                                              |
| ------------ | ------ | -------- | -------------------------------------------------------- |
| `baseUrl`    | string | No       | Custom API base URL (default: Bungee public backend)     |
| `providerId` | string | No       | Custom provider identifier (default: `"bungee"`)         |
| `apiKey`     | string | No       | Bungee API key for authentication (sent via `x-api-key`) |

## Creating the Provider

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Default config — no API key required for public access
const bungeeProvider = createCrossChainProvider("bungee");

// With custom config
const bungeeProvider = createCrossChainProvider("bungee", {
    apiKey: "your-api-key",
});
```

## Getting Quotes

```typescript
const quotes = await bungeeProvider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 10, // Optimism
        assetAddress: "0xInputTokenAddress",
        amount: "1000000000000000000", // 1 token (in wei)
    },
    output: {
        chainId: 42161, // Arbitrum
        assetAddress: "0xOutputTokenAddress",
    },
    swapType: "exact-input",
});

const quote = quotes[0]; // Select the first quote
```

## Fees

After getting a quote, you can inspect the standardized fee breakdown via `quote.fees`:

```typescript
const quote = quotes[0];

console.log(quote.fees?.originGas); // origin chain gas estimate
```

See the [API reference](./api.md#quotefees) for the full `QuoteFees` type.

## Executing Transactions

Bungee supports two execution modes depending on the asset type:

### Native ETH (User Mode — Transaction)

For native ETH transfers, the user sends a transaction directly:

```typescript
import { getTransactionSteps } from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { optimism } from "viem/chains";

const walletClient = createWalletClient({
    chain: optimism,
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
```

### ERC20 (Protocol Mode — Permit2 Signature)

For ERC20 transfers, the user signs a permit2 message and the protocol submits the order:

```typescript
import { getSignatureSteps } from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { optimism } from "viem/chains";

const walletClient = createWalletClient({
    chain: optimism,
    transport: http(),
    account: yourAccount,
});

const step = getSignatureSteps(quote.order)[0];
const { signatureType, ...typedData } = step.signaturePayload;
const signature = await walletClient.signTypedData(typedData);
await bungeeProvider.submitOrder(quote, signature);
```

## Tracking

Bungee uses API-based tracking. The SDK polls the status endpoint at a 5-second interval:

```
GET /api/v1/bungee/status?requestHash=<txHashOrOrderId>
```

No extra RPC URLs are needed — tracking is handled entirely through the Bungee API.

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Bungee Protocol Documentation](https://docs.bungee.exchange)
-   [API Reference](./api.md) — full type definitions for quotes, fees, and orders
-   [Concepts](./concepts.md) — how intent-based transfers work
