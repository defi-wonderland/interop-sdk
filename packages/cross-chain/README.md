# @wonderland/interop-cross-chain

The cross-chain package provides a standardized interface for interacting with cross-chain bridges and protocols. It enables seamless token transfers and swaps between different blockchain networks through a unified API.

Key features:

-   Cross-chain token transfers between supported networks
-   Cross-chain token swaps with customizable slippage
-   Quote fetching for cross-chain operations
-   Standardized provider interface for integrating different bridge protocols
-   Type-safe interactions with comprehensive TypeScript support
-   Step-based order model (signature and transaction steps)

## Setup

1. Install dependencies running `pnpm install`

## Available Scripts

Available scripts that can be run using `pnpm`:

| Script        | Description                                             |
| ------------- | ------------------------------------------------------- |
| `build`       | Build library using tsc                                 |
| `check-types` | Check types issues using tsc                            |
| `clean`       | Remove `dist` folder                                    |
| `lint`        | Run ESLint to check for coding standards                |
| `lint:fix`    | Run linter and automatically fix code formatting issues |
| `format`      | Check code formatting and style using Prettier          |
| `format:fix`  | Run formatter and automatically fix issues              |
| `test`        | Run tests using vitest                                  |
| `test:cov`    | Run tests with coverage report                          |

## Usage

```typescript
import type { QuoteRequest } from "@wonderland/interop-cross-chain";
import {
    createAggregator,
    createCrossChainProvider,
    getSignatureSteps,
    getTransactionSteps,
    isSignatureOnlyOrder,
} from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

const walletClient = createWalletClient({
    chain: sepolia,
    transport: http("https://..."),
    account: "0x...",
});

// Create providers for different protocols
const acrossProvider = createCrossChainProvider("across");
const oifProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://...",
});

// Create aggregator with providers (can mix Across, OIF, etc.)
const aggregator = createAggregator({
    providers: [acrossProvider, oifProvider],
});

// Get quotes using SDK QuoteRequest format
const quoteRequest: QuoteRequest = {
    user: "0xYourAddress",
    input: {
        chainId: 11155111,
        assetAddress: "0xTokenAddress",
        amount: "1000000000000000000",
    },
    output: {
        chainId: 84532,
        assetAddress: "0xOutputTokenAddress",
        recipient: "0xRecipientAddress",
    },
    swapType: "exact-input",
};

const response = await aggregator.getQuotes(quoteRequest);
const selectedQuote = response.quotes[0];

if (selectedQuote) {
    if (isSignatureOnlyOrder(selectedQuote.order)) {
        // Protocol mode: sign EIP-712 typed data (gasless for user)
        const step = getSignatureSteps(selectedQuote.order)[0];
        const { signatureType, ...typedData } = step.signaturePayload;
        const signature = await walletClient.signTypedData(typedData);
        await aggregator.submitOrder(selectedQuote, signature);
    } else {
        // User mode: execute transaction directly (user pays gas)
        const step = getTransactionSteps(selectedQuote.order)[0];
        await walletClient.sendTransaction({
            to: step.transaction.to,
            data: step.transaction.data,
            value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
        });
    }
}
```

## API

### Providers

-   `createCrossChainProvider(protocolName, config?)` -- Create a provider for a supported protocol. Config is optional for Across (defaults to mainnet), required for OIF.
-   `CrossChainProvider` (abstract class)
    -   `.protocolName` -- Returns the protocol name.
    -   `.providerId` -- Returns the provider identifier.
    -   `.getQuotes(params: QuoteRequest)` -- Fetch quotes for a cross-chain request.
    -   `.submitOrder(quote, signature)` -- Submit a signed order to the provider.
    -   `.getTrackingConfig()` -- Get configuration for order tracking.

### Tracking Notes (Across)

-   **Mainnet**: fill tracking defaults to **API-based polling** via the Across API.
-   **Testnet**: fill tracking defaults to **event-based watching** (Across testnet API is not reliable).
-   The SDK still parses the **origin-chain open event**, so provide an origin-chain RPC URL for robust tracking.

### Aggregator

-   `createAggregator(config)` -- Create an aggregator for batch quoting and execution.
    -   Config: `{ providers: CrossChainProvider[], sortingStrategy?, timeoutMs?, trackerFactory? }`
-   `Aggregator`
    -   `.getQuotes(params: QuoteRequest)` -- Get quotes from all providers. Returns `{ quotes: ExecutableQuote[], errors: GetQuotesError[] }`.
    -   `.submitOrder(quote, signature)` -- Submit a signed order.
    -   `.prepareTracking(providerId)` -- Prepare order tracking for a provider.
    -   `.track(params)` -- Track an existing transaction.
    -   `.getOrderStatus(params)` -- Get current status without watching.

### Asset Discovery

The SDK provides utilities to discover supported assets from providers. All discovery methods return a pre-processed `DiscoveredAssets` structure ready for consumption.

**Via Aggregator (recommended):**

```typescript
import { createAggregator } from "@wonderland/interop-cross-chain";

const aggregator = createAggregator({ providers: [acrossProvider] });

// Discover assets from all configured providers
const discovered = await aggregator.discoverAssets({ chainIds: [1, 42161] });

// Get tokens for Ethereum using numeric chain ID
const ethTokens = discovered.tokensByChain[1];

// Get metadata for a specific token (nested by chainId then lowercase address)
const usdc = discovered.tokenMetadata[1]?.["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"];
console.log(usdc.symbol); // "USDC"
console.log(usdc.decimals); // 6
```

**Via individual service:**

```typescript
import { createAssetDiscoveryService } from "@wonderland/interop-cross-chain";

const service = createAssetDiscoveryService(provider);
const discovered = await service.getSupportedAssets(); // Returns DiscoveredAssets directly

const ethTokens = discovered.tokensByChain[1];
```

**Key concepts:**

-   **Numeric chain IDs**: Chain keys are plain numbers (e.g., `1` for Ethereum, `42161` for Arbitrum) — the same format used by viem and the rest of the SDK.
-   **Plain addresses**: All addresses in `tokensByChain` and `tokenMetadata` use standard `0x`-prefixed format, ready for display or wallet interaction.
-   **Nested metadata**: `tokenMetadata` is nested by chain ID then lowercase address to prevent cross-chain address collisions.

**Types:**

-   `DiscoveredAssets` -- Aggregated discovery result with `tokensByChain` and `tokenMetadata`.
-   `AssetInfo` -- Token metadata: `{ address, symbol, decimals }`.

### Types

-   `QuoteRequest` -- SDK-friendly quote request with `user`, `input`, `output`, and `swapType`.
-   `Quote` -- Quote with step-based `order`, `preview`, `provider`, and `metadata`.
-   `ExecutableQuote` -- Quote with provider context for submission.
-   `Order` -- Step-based order model with `steps: (SignatureStep | TransactionStep)[]`.
-   `InteropAccountId` -- Chain-aware account identifier: `{ chainId: number, address: string }`.

### Step Helpers

-   `getSignatureSteps(order)` -- Extract signature steps from an order.
-   `getTransactionSteps(order)` -- Extract transaction steps from an order.
-   `isSignatureOnlyOrder(order)` -- Check if an order only requires signatures.
-   `isTransactionOnlyOrder(order)` -- Check if an order only requires transactions.

## OIF Provider

The OIF Provider enables integration with any [Open Intents Framework](https://docs.openintents.xyz/) compliant solver.

### Usage

```typescript
import type { QuoteRequest } from "@wonderland/interop-cross-chain";
import {
    createCrossChainProvider,
    getSignatureSteps,
    getTransactionSteps,
    isSignatureOnlyOrder,
} from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";

const walletClient = createWalletClient({
    chain: mainnet,
    transport: http("https://..."),
    account: "0x...",
});

// Create OIF provider with your solver endpoint
const provider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://...",
});

// Get quotes using SDK QuoteRequest
const quotes = await provider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 1,
        assetAddress: "0xTokenAddress",
        amount: "1000000",
    },
    output: {
        chainId: 42161,
        assetAddress: "0xOutputTokenAddress",
    },
    swapType: "exact-input",
});

const quote = quotes[0];
if (!quote) throw new Error("No quotes returned");

if (isSignatureOnlyOrder(quote.order)) {
    // Protocol Mode: Sign and submit order (gasless for user)
    const step = getSignatureSteps(quote.order)[0];
    const { signatureType, ...typedData } = step.signaturePayload;
    const signature = await walletClient.signTypedData(typedData);
    await provider.submitOrder(quote, signature);
} else {
    // User Mode: Execute transaction directly (user pays gas)
    const step = getTransactionSteps(quote.order)[0];
    await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
        value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
    });
}
```

### Approval Requirements

Access approval info from the order checks:

```typescript
// Get allowance requirements from order checks
const allowances = quote.order.checks?.allowances ?? [];
for (const { spender, tokenAddress, required } of allowances) {
    // Approve token spend if needed
}
```

## Payload Validation

The SDK validates that calldata from solver APIs matches the user's intent. For Across, simple same-token bridges are fully validated (depositor, recipient, tokens, amount, chain). Cross-chain swap validation is coming soon.

## References

-   [Open Intents Framework](https://docs.openintents.xyz/) - OIF API specification and documentation
-   [Viem Documentation](https://viem.sh/) - Low-level Ethereum interface used for transaction handling
-   [Zod Documentation](https://zod.dev/) - TypeScript-first schema validation used for input validation
-   [Cross-Chain Interoperability Standards](https://ethereum.org/en/developers/docs/bridges/) - Overview of cross-chain bridge concepts

The current SDK uses Across on testnet for demo purposes only. Performance may not reflect mainnet behavior and is not representative of the final production experience
