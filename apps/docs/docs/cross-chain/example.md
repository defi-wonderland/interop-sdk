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
    createCrossChainProvider,
    getSignatureSteps,
    getTransactionSteps,
    isSignatureOnlyOrder,
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

Initialize the cross-chain provider and aggregator, which will handle quoting and executing cross-chain transfers.

### Testnet (Sepolia → Base Sepolia)

```typescript
const acrossProvider = createCrossChainProvider("across", { isTestnet: true });
const relayProvider = createCrossChainProvider("relay", { isTestnet: true });

const aggregator = createAggregator({
    providers: [acrossProvider, relayProvider],
});
```

### Mainnet (Base → Arbitrum)

For mainnet, omit `isTestnet` (or set it to `false`) and use the corresponding mainnet chain IDs when building your clients (step 2) and quote request (step 4).

```typescript
const acrossProvider = createCrossChainProvider("across");
const relayProvider = createCrossChainProvider("relay");

const aggregator = createAggregator({
    providers: [acrossProvider, relayProvider],
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

## 5. Check and Handle ERC-20 Approvals

Before submitting the transaction, check whether the selected provider requires an ERC-20 token approval.

```typescript
import { erc20Abi } from "viem";

const quote = response.quotes[0];

const allowances = quote.order.checks?.allowances ?? [];
for (const { tokenAddress, spender, required } of allowances) {
    const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account.address, spender],
    });
    if (allowance < BigInt(required)) {
        const hash = await walletClient.writeContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [spender, BigInt(required)],
        });
        await publicClient.waitForTransactionReceipt({ hash });
    }
}
```

:::warning ERC-20 approval behaviour varies by provider

- `checks.allowances` is only populated by **some providers** (OIF, Bungee). When it is present, the loop above handles approvals automatically.
- **Across does NOT populate `checks.allowances`.** If you are bridging an ERC-20 with Across, you must approve the input token to `step.transaction.to` yourself before calling `walletClient.sendTransaction`.
- For **native ETH transfers**, no approval is needed regardless of which provider you use.

:::

## 6. Execute the Cross-Chain Transaction

Execute the quote based on its order step type:

```typescript
if (isSignatureOnlyOrder(quote.order)) {
    // Protocol mode: sign and submit (gasless for user)
    // Note: production code should handle all steps, not just the first
    const step = getSignatureSteps(quote.order)[0];
    const { signatureType, ...typedData } = step.signaturePayload;
    const signature = await walletClient.signTypedData(typedData);
    await aggregator.submitOrder(quote, signature);
    console.log("Order submitted via signature");
} else {
    // User mode: send transaction directly
    // Note: production code should handle all steps, not just the first
    const step = getTransactionSteps(quote.order)[0];
    const { to, data, value, gas, maxFeePerGas, maxPriorityFeePerGas } = step.transaction;
    console.log("Sending transaction...");
    const hash = await walletClient.sendTransaction({
        to,
        data,
        value: value ? BigInt(value) : undefined,
        gas: gas ? BigInt(gas) : undefined,
        maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : undefined,
        maxPriorityFeePerGas: maxPriorityFeePerGas ? BigInt(maxPriorityFeePerGas) : undefined,
    });
    console.log("Transaction sent:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed:", receipt.status === "success" ? "Success" : "Failed");
}
```

## 7. Run the Main Function

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
