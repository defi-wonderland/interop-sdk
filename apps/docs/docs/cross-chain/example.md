---
title: Execute Intent
---

# Execute Intent

This guide demonstrates how to execute a cross-chain intent using the SDK. The process is broken down into clear steps, each with a brief explanation.

## 1. Setup: Import Dependencies and Configure Environment

First, import the required libraries and set up your environment variables, such as your private key and a generic RPC URL.

```js
import {
    createCrossChainProvider,
    createProviderExecutor,
    InteropAddressParamsParser,
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
});
```

## 3. Set Up Cross-Chain Provider and Executor

Initialize the cross-chain provider and executor, which will handle quoting and executing cross-chain transfers.

```js
const acrossProvider = createCrossChainProvider(
    "across",
    { apiUrl: "https://..." }, // Provider config
    {}, // Dependencies
);

const executor = createProviderExecutor([acrossProvider], {
    paramParser: new InteropAddressParamsParser(),
});
```

## 4. Retrieve a Cross-Chain Quote

Request a quote for a cross-chain transfer by specifying sender, recipient, amount, and token addresses.

```js
const params = await executor.getQuotes("crossChainTransfer", {
    sender: "0xeca5cca87fDF2Cb3f3a5d795699cEAA561c4B19d@eip155:11155111#2597C7E5",
    recipient: "0x8043951e77347c5282d6bcD2294e134B4072fE3b@eip155:84532#D9F7BE3F",
    amount: "0.100",
    inputTokenAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    outputTokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
});

if (!params[0] || (params[0] && "error" in params[0])) {
    console.error(params[0]?.error || "No quote found");
    return;
}
```

## 5. Execute the Cross-Chain Transaction

Execute the quote using your wallet client:

```js
// Select the quote you prefer
const quote = params[0];

if (quote.preparedTransaction) {
    console.log("Sending transaction...");
    const hash = await walletClient.sendTransaction(quote.preparedTransaction);
    console.log("Transaction sent:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed:", receipt.status === "success" ? "Success" : "Failed");
} else {
    console.error("No prepared transaction in quote");
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

## Optional: Track Intent Status

After executing the transaction, you can track its status using the Intent Tracker:

```js
import { createIntentTracker } from "@wonderland/interop-cross-chain";

const tracker = createIntentTracker("across");

// Track the intent
for await (const update of tracker.watchIntent({
    txHash: txHash, // from step 5
    originChainId: 11155111,
    destinationChainId: 84532,
})) {
    console.log(`[${update.status}] ${update.message}`);

    if (update.status === "filled") {
        console.log("Transfer completed!");
        break;
    } else if (update.status === "expired") {
        console.log("Transfer expired");
        break;
    }
}
```
