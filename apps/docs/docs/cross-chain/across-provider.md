---
title: Across Provider
---

The Across Protocol provider enables cross-chain token transfers using the Across bridge infrastructure.

**Status**: Testnet

## Configuration

| Field        | Type   | Required | Description                |
| ------------ | ------ | -------- | -------------------------- |
| `apiUrl`     | string | Yes      | Across API endpoint URL    |
| `providerId` | string | No       | Custom provider identifier |

## Creating the Provider

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider(
    "across",
    { apiUrl: "https://testnet.across.to/api" },
    {},
);
```

## Getting Quotes

```typescript
const quotes = await acrossProvider.getQuotes({
    user: USER_INTEROP_ADDRESS, // user's interop address (binary format)
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: USER_INTEROP_ADDRESS, // sender's interop address (binary format)
                asset: INPUT_TOKEN_INTEROP_ADDRESS, // input token interop address (binary format)
                amount: "1000000000000000000", // 1 token (in wei)
            },
        ],
        outputs: [
            {
                receiver: RECEIVER_INTEROP_ADDRESS, // recipient's interop address (binary format)
                asset: OUTPUT_TOKEN_INTEROP_ADDRESS, // output token interop address (binary format)
            },
        ],
        swapType: "exact-input",
    },
    supportedTypes: ["across"], // Required by OIF interface, value is ignored by Across
});

const quote = quotes[0]; // Select the first quote
```

## Executing Transactions

After getting a quote, execute the transaction using the prepared transaction:

```typescript
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(),
    account: yourAccount,
});

if (quote.preparedTransaction) {
    const hash = await walletClient.sendTransaction(quote.preparedTransaction);
    console.log("Transaction sent:", hash);
}
```

## Features

-   Cross-chain token transfers
-   Quote fetching with fee calculation
-   Transaction simulation
-   Intent tracking support
-   EIP-7683 Open Intent Framework integration

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Across Protocol Documentation](https://docs.across.to/)
