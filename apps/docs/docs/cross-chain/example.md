---
title: Execute Intent
---

# Execute Intent

This guide demonstrates how to execute a cross-chain intent using the SDK. The process is broken down into clear steps, each with a brief explanation.

## 1. Setup: Import Dependencies and Configure Environment

First, import the required libraries and set up your environment variables, such as your private key and a generic RPC URL.

```js
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

## 3. Set Up Cross-Chain Provider and Aggregator

Initialize the cross-chain provider and aggregator, which will handle quoting and executing cross-chain transfers.

```js
const acrossProvider = createCrossChainProvider("across", { isTestnet: true });

const aggregator = createAggregator({
    providers: [acrossProvider],
});
```

## 4. Retrieve a Cross-Chain Quote

Request a quote for a cross-chain transfer using the SDK `QuoteRequest` format.

```js
const response = await aggregator.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 11155111,
        assetAddress: "0xInputTokenAddress",
        amount: "100000000000000000", // 0.1 in wei
    },
    output: {
        chainId: 84532,
        assetAddress: "0xOutputTokenAddress",
        recipient: "0xRecipientAddress",
    },
    swapType: "exact-input",
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

## 5. Execute the Cross-Chain Transaction

Execute the quote based on its order step type:

```js
const quote = response.quotes[0];

if (isSignatureOnlyOrder(quote.order)) {
    // Protocol mode: sign and submit (gasless for user)
    const step = getSignatureSteps(quote.order)[0];
    const { signatureType, ...typedData } = step.signaturePayload;
    const signature = await walletClient.signTypedData(typedData);
    await aggregator.submitOrder(quote, signature);
    console.log("Order submitted via signature");
} else {
    // User mode: send transaction directly
    const step = getTransactionSteps(quote.order)[0];
    console.log("Sending transaction...");
    const hash = await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
        value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
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
