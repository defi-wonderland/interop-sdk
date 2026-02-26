---
title: Across Provider
---

The Across Protocol provider enables cross-chain token transfers using the Across bridge infrastructure.

**Status**: Testnet

## Configuration

| Field        | Type    | Required | Description                                   |
| ------------ | ------- | -------- | --------------------------------------------- |
| `isTestnet`  | boolean | No       | Use testnet API (default: false)              |
| `apiUrl`     | string  | No       | Custom API endpoint URL (overrides isTestnet) |
| `providerId` | string  | No       | Custom provider identifier                    |

Notes:

-   `isTestnet` also affects **tracking** defaults (see below).
-   `apiUrl` overrides the **quote** endpoint. Tracking uses the standard Across API base URL for the selected network.

## Creating the Provider

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Across config is optional - defaults to mainnet
// Mainnet: https://app.across.to/api
// Testnet: https://testnet.across.to/api
const acrossProvider = createCrossChainProvider("across", { isTestnet: true });
```

## Getting Quotes

Use the `ProviderExecutor` for SDK-friendly types with readable addresses:

```typescript
import { createProviderExecutor } from "@wonderland/interop-cross-chain";

const executor = createProviderExecutor({ providers: [acrossProvider] });

const response = await executor.getQuotes({
    user: { chainId: 11155111, address: "0xYourAddress..." },
    intent: {
        inputs: [
            // Across only supports single input/output
            {
                asset: { chainId: 11155111, address: "0xInputToken..." },
                amount: "1000000000000000000", // 1 token (in smallest unit)
            },
        ],
        outputs: [
            {
                asset: { chainId: 84532, address: "0xOutputToken..." },
            },
        ],
        swapType: "exact-input",
    },
});

const quote = response.quotes[0]; // Select the first quote
```

## Executing Transactions

Across quotes return a **transaction step** — send the transaction directly:

```typescript
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(),
    account: yourAccount,
});

const step = quote.order.steps[0]; // TransactionStep

if (step.kind === "transaction") {
    const hash = await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
        ...(step.transaction.value && { value: BigInt(step.transaction.value) }),
    });
    console.log("Transaction sent:", hash);
}
```

## Features

-   Cross-chain token transfers
-   Quote fetching with fee calculation
-   Transaction simulation
-   Order tracking support
-   EIP-7683 Open Intent Framework integration
-   Payload validation for simple bridges

## Tracking (Mainnet vs Testnet)

Across tracking is implemented as:

-   **Mainnet**: API-based fill tracking (polls `GET /deposit/status?depositTxnRef=<openTxHash>`)
-   **Testnet**: Event-based fill tracking (Across testnet API is not reliable)

In both cases, the SDK parses the ERC-7683 open event on the **origin chain**, so you should provide an origin-chain RPC URL for robust tracking.

## Payload Validation

The provider validates that calldata from the solver API matches the user's intent:

| Operation                           | Validation                                                    |
| ----------------------------------- | ------------------------------------------------------------- |
| Simple bridge (same token)          | Full validation (depositor, recipient, tokens, amount, chain) |
| Cross-chain swap (different tokens) | Coming soon                                                   |

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Across Protocol Documentation](https://docs.across.to/)
