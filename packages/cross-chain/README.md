# @wonderland/interop-cross-chain

🚧 The cross-chain package is under construction 🚧

The cross-chain package provides a standardized interface for interacting with cross-chain bridges and protocols. It enables seamless token transfers and swaps between different blockchain networks through a unified API.

Key features:

-   Cross-chain token transfers between supported networks
-   Cross-chain token swaps with customizable slippage
-   Quote fetching for cross-chain operations
-   Standardized provider interface for integrating different bridge protocols
-   Type-safe interactions with comprehensive TypeScript support

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
import { createCrossChainProvider, createProviderExecutor } from "@wonderland/interop-cross-chain";
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

// Setup viem clients (needed for transaction execution)
const publicClient = createPublicClient({
    chain: sepolia,
    transport: http("https://..."),
});

const walletClient = createWalletClient({
    chain: sepolia,
    transport: http("https://..."),
    account: "0x...", // Your account
});

// Create providers for different protocols
// Across example:
const acrossProvider = createCrossChainProvider("across", { apiUrl: "https://..." }, {});

// OIF example:
const oifProvider = createCrossChainProvider(
    "oif",
    { solverId: "my-solver", url: "https://..." },
    {},
);

// Create executor with providers (can mix Across, OIF, etc.)
const executor = createProviderExecutor({
    providers: [acrossProvider, oifProvider],
});

// Get quotes using OIF GetQuoteRequest format
const response = await executor.getQuotes({
    user: "0x...@eip155:11155111#...",
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: "0x...@eip155:11155111#...",
                asset: "0x...@eip155:11155111#...",
                amount: "1000000000000000000",
            },
        ],
        outputs: [
            {
                receiver: "0x...@eip155:84532#...",
                asset: "0x...@eip155:84532#...",
            },
        ],
        swapType: "exact-input",
    },
    supportedTypes: ["oif-escrow-v0"],
});

// Execute the selected quote
const selectedQuote = response.quotes[0];
if (selectedQuote?.preparedTransaction) {
    const hash = await walletClient.sendTransaction(selectedQuote.preparedTransaction);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
}
```

## API

### Providers

-   `createCrossChainProvider(protocolName, config, dependencies)` – Create a provider for a supported protocol (e.g., "across", "oif").
-   `CrossChainProvider` (abstract class)
    -   `.getProtocolName()` – Returns the protocol name.
    -   `.getProviderId()` – Returns the provider identifier.
    -   `.getQuotes(params)` – Fetch quotes for a cross-chain request (OIF GetQuoteRequest format).
    -   `.submitSignedOrder(quote, signature)` – Submit a signed order to the provider (throws MethodNotImplemented for providers that don't support it, like Across).
    -   `.getTrackingConfig()` – Get configuration for intent tracking.

### Provider Executor

-   `createProviderExecutor(config)` – Create an executor for batch quoting and execution.
    -   Config: `{ providers: CrossChainProvider[], sortingStrategy?, timeoutMs?, trackerFactory? }`
-   `ProviderExecutor`
    -   `.getQuotes(params)` – Get quotes from all providers (params: GetQuoteRequest, returns: GetQuotesResponse).
    -   `.prepareTracking(providerId)` – Prepare intent tracking for a provider.
    -   `.track(params)` – Track an existing transaction.
    -   `.getIntentStatus(params)` – Get current status without watching.

### Types

-   `GetQuoteRequest` – OIF-compliant quote request (see `@openintentsframework/oif-specs`).
-   `GetQuotesResponse` – Response containing `{ quotes: ExecutableQuote[], errors: GetQuotesError[] }`.
-   `ExecutableQuote` – Quote with optional `preparedTransaction` for execution.
-   `ProviderExecutorConfig`, `IntentTrackerConfig`, and more (see exported types).

## OIF Provider

The OIF Provider enables integration with any [Open Intents Framework](https://docs.openintents.xyz/) compliant solver.

### Usage

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";

// Setup wallet client
const walletClient = createWalletClient({
    chain: mainnet,
    transport: http("https://..."),
    account: "0x...",
});

// Create OIF provider with your solver endpoint
const provider = createCrossChainProvider("oif", { solverId: "my-solver", url: "https://..." }, {});

// Get quotes using OIF GetQuoteRequest format
const response = await provider.getQuotes({
    user: "0x...@eip155:1#...",
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: "0x...@eip155:1#...",
                asset: "0x...@eip155:1#...",
                amount: "1000000",
            },
        ],
        outputs: [
            {
                receiver: "0x...@eip155:1#...",
                asset: "0x...@eip155:1#...",
            },
        ],
        swapType: "exact-input",
    },
    supportedTypes: ["oif-escrow-v0"],
});

// Protocol Mode: Sign and submit order (gasless for user)
const { domain, primaryType, message, types } = response[0].order.payload;
const signature = await walletClient.signTypedData({ domain, primaryType, message, types });
await provider.submitSignedOrder(response[0], signature);

// User Mode: Execute transaction directly (user pays gas)
if (response[0]?.preparedTransaction) {
    await walletClient.sendTransaction(response[0].preparedTransaction);
}
```

### Approval Requirements

Access approval info directly from the quote:

```typescript
// Protocol mode (oif-escrow-v0) - typically Permit2
const spender = quote.order.payload.message.spender;

// User mode (oif-user-open-v0)
const { spender, token, required } = quote.order.checks.allowances[0];
```

## References

-   [Open Intents Framework](https://docs.openintents.xyz/) - OIF API specification and documentation
-   [Viem Documentation](https://viem.sh/) - Low-level Ethereum interface used for transaction handling
-   [Zod Documentation](https://zod.dev/) - TypeScript-first schema validation used for input validation
-   [Cross-Chain Interoperability Standards](https://ethereum.org/en/developers/docs/bridges/) - Overview of cross-chain bridge concepts

The current SDK uses Across on testnet for demo purposes only. Performance may not reflect mainnet behavior and is not representative of the final production experience
