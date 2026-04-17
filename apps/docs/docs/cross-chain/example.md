---
title: Execute Intent
---

# Execute Intent

This guide demonstrates how to execute a cross-chain intent using the SDK. The process is broken down into clear steps, each with a brief explanation.

## 1. Setup: Import Dependencies and Configure Environment

First, import the required libraries and set up your environment variables, such as your private key and a generic RPC URL.

```typescript
import {
    createAggregator,
    createApprovalService,
    createCrossChainProvider,
    PROTOCOLS,
} from "@wonderland/interop-cross-chain";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// Private key for the account to send the transactions
const PRIVATE_KEY = "";

// Configure your preferred RPC URL for Sepolia (or any supported chain)
const RPC_URL = process.env.RPC_URL || ""; // e.g., "https://sepolia.infura.io/v3/<API_KEY>"

const privateAccount = privateKeyToAccount(PRIVATE_KEY);
```

## 2. Initialize Blockchain Clients

Create public and wallet clients for interacting with the blockchain, using the generic RPC URL.

```typescript
const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
});

const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(RPC_URL),
    account: privateAccount,
});
```

## 3. Set Up Cross-Chain Provider and Aggregator

Initialize the cross-chain provider and aggregator, which will handle quoting and executing cross-chain transfers. Wire an `approvalService` so the aggregator prepends any required ERC-20 `approve` steps to each quote automatically.

### Testnet (Sepolia → Base Sepolia)

```typescript
const acrossProvider = createCrossChainProvider(PROTOCOLS.ACROSS, { isTestnet: true });
const relayProvider = createCrossChainProvider(PROTOCOLS.RELAY, { isTestnet: true });

const approvalService = createApprovalService({
    rpcUrls: {
        11155111: RPC_URL, // Sepolia
        84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
    },
});

const aggregator = createAggregator({
    providers: [acrossProvider, relayProvider],
    approvalService,
});
```

### Mainnet (Base → Arbitrum)

For mainnet, omit `isTestnet` (or set it to `false`) and use the corresponding mainnet chain IDs when building your clients (step 2), the approval service, and the quote request (step 4).

```typescript
const acrossProvider = createCrossChainProvider(PROTOCOLS.ACROSS);
const relayProvider = createCrossChainProvider(PROTOCOLS.RELAY);

const approvalService = createApprovalService({
    rpcUrls: {
        8453: RPC_URL, // Base
        42161: "https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
    },
});

const aggregator = createAggregator({
    providers: [acrossProvider, relayProvider],
    approvalService,
});
```

## 4. Retrieve a Cross-Chain Quote

Request a quote for a cross-chain transfer using the SDK `QuoteRequest` format.

### Testnet example

```typescript
const response = await aggregator.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 11155111, // Sepolia
        assetAddress: "0xInputTokenAddress",
        amount: "100000000000000000", // 0.1 in wei
    },
    output: {
        chainId: 84532, // Base Sepolia
        assetAddress: "0xOutputTokenAddress",
        recipient: "0xRecipientAddress",
    },
    swapType: "exact-input",
});
```

### Mainnet example (Base → Arbitrum)

```typescript
const response = await aggregator.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 8453, // Base
        assetAddress: "0xInputTokenAddress",
        amount: "100000000000000000", // 0.1 in wei
    },
    output: {
        chainId: 42161, // Arbitrum One
        assetAddress: "0xOutputTokenAddress",
        recipient: "0xRecipientAddress",
    },
    swapType: "exact-input",
});

if (response.errors.length > 0) {
    console.error("Errors:", response.errors);
}

if (response.quotes.length === 0) {
    console.error("No quotes available");
    return;
}
```

## 5. Execute the Cross-Chain Transaction

Because the aggregator was configured with an `approvalService` (step 3), each returned `quote.order.steps` already contains any ERC-20 `approve` step that the transfer needs, prepended before the transfer itself. Iterate the steps in order and handle each by `step.kind` — a single order can mix `transaction` steps (approvals, user-submitted bridges) and `signature` steps (gasless). On the first signature step, sign and submit, then stop: the solver takes the order from there.

```typescript
const quote = response.quotes[0];

// Iterate order.steps in emission order. approvalService prepends approval
// TransactionSteps onto signature-based quotes too, so a single order can
// mix both kinds — handle each by `step.kind`. On the first signature step,
// sign + submit and stop: the solver takes the order from there. (`submitOrder`
// currently forwards one signature per order; multi-signature orders aren't
// yet supported.)
for (const step of quote.order.steps) {
    if (step.kind === "transaction") {
        const { to, data, value, gas, maxFeePerGas, maxPriorityFeePerGas } = step.transaction;
        console.log(`Sending step: ${step.description ?? "transaction"}`);
        const hash = await walletClient.sendTransaction({
            to,
            data,
            value: value ? BigInt(value) : undefined,
            gas: gas ? BigInt(gas) : undefined,
            maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : undefined,
            maxPriorityFeePerGas: maxPriorityFeePerGas ? BigInt(maxPriorityFeePerGas) : undefined,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
            throw new Error(`Step failed: ${step.description ?? "transaction"}`);
        }
        console.log("Confirmed: Success");
    } else {
        const { signatureType, ...typedData } = step.signaturePayload;
        const signature = await walletClient.signTypedData(typedData);
        await aggregator.submitOrder(quote, signature);
        console.log("Order submitted via signature");
        break;
    }
}
```

:::info Native token inputs
Native token inputs (ETH, MATIC, etc.) never require approval, so no `approve` step is prepended. The approval service only enriches quotes whose `order.checks.allowances` lists an ERC-20 allowance that is below `required` on-chain.
:::

## 6. Run the Main Function

Finally, call the main function to execute the workflow.

```typescript
const main = async (): Promise<void> => {
    // ...all the above steps go here...
};

main().catch(console.error);
```

## Next steps

-   [Order Tracking](./intent-tracking.md) — monitor your transaction from initiation to completion
-   [Concepts](./concepts.md) — understand intent-based architecture and EIP-7683
-   [API Reference](./api.md) — complete function signatures and types
