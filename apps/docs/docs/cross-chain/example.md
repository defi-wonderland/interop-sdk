---
title: Execute Intent
---

# Execute Intent

This guide demonstrates how to execute a cross-chain intent using the SDK. The process is broken down into clear steps, each with a brief explanation.

## 1. Setup: Import Dependencies and Configure Environment

First, import the required libraries and set up your environment variables, such as your private key and a generic RPC URL.

```js
import { createCrossChainProvider, createProviderExecutor } from "@wonderland/interop-cross-chain";
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

```js
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

## 3. Set Up Cross-Chain Provider and Executor

Initialize the cross-chain provider and executor, which will handle quoting and executing cross-chain transfers.

```js
const acrossProvider = createCrossChainProvider("across", { isTestnet: true });

const executor = createProviderExecutor({
    providers: [acrossProvider],
});
```

## 4. Retrieve a Cross-Chain Quote

Request a quote using the SDK-friendly `QuoteRequest` format. Addresses use `{ chainId, address }` objects:

```js
const response = await executor.getQuotes({
    user: { chainId: 11155111, address: privateAccount.address },
    intent: {
        inputs: [
            {
                asset: { chainId: 11155111, address: "0xInputToken..." },
                amount: "100000000000000000", // 0.1 in smallest unit
            },
        ],
        outputs: [
            {
                asset: { chainId: 84532, address: "0xOutputToken..." },
                // recipient defaults to user on the output chain
            },
        ],
        swapType: "exact-input",
    },
});

// Check for errors
if (response.errors.length > 0) {
    console.error("Errors:", response.errors);
}

// Check if we got quotes
if (response.quotes.length === 0) {
    console.error("No quotes available");
    return;
}
```

## 5. Execute the Cross-Chain Order

Each quote contains a step-based `order`. Inspect the first step to determine the execution mode:

```js
const quote = response.quotes[0];
const step = quote.order.steps[0];

if (step.kind === "signature") {
    // Protocol mode (gasless): sign EIP-712 data and submit to solver
    console.log("Signing order...");
    const signature = await walletClient.signTypedData(step.signaturePayload);
    const { orderId } = await executor.submitOrder(quote, signature);
    console.log("Order submitted:", orderId);
} else if (step.kind === "transaction") {
    // User mode: send the transaction on-chain
    console.log("Sending transaction...");
    const hash = await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
    });
    console.log("Transaction sent:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed:", receipt.status === "success" ? "Success" : "Failed");
}
```

## 6. Run the Main Function

Finally, call the main function to execute the workflow.

```js
const main = async (): Promise<void> => {
    // ...all the above steps go here...
};

main().catch(console.error);
```

## Next Step

Learn how to monitor your transaction: [Order Tracking](./intent-tracking.md)
