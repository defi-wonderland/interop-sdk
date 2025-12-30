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

const acrossProvider = createCrossChainProvider("across", {
    apiUrl: "https://testnet.across.to/api",
});
```

## Getting Quotes

```typescript
const quotes = await acrossProvider.getQuotes({
    user: "0xYourAddress@eip155:11155111#CHECKSUM", // user interop address
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: "0xYourAddress@eip155:11155111#CHECKSUM", // sender interop address
                asset: "0xInputToken@eip155:11155111#CHECKSUM", // input token interop address
                amount: "1000000000000000000", // 1 token (in wei)
            },
        ],
        outputs: [
            {
                receiver: "0xRecipient@eip155:84532#CHECKSUM", // recipient interop address
                asset: "0xOutputToken@eip155:84532#CHECKSUM", // output token interop address
            },
        ],
        swapType: "exact-input",
    },
    supportedTypes: ["across"],
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

## Supported Actions

-   `crossChainTransfer`

> Currently, Across Protocol only supports `crossChainTransfer`. Cross-chain swaps are planned for future releases.

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Across Protocol Documentation](https://docs.across.to/)
