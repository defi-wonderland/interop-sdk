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
import {
    AcrossProvider,
    createCrossChainProvider,
    createProviderExecutor,
    InteropAddressParamsParser,
    ProviderExecutor,
} from "@wonderland/interop-cross-chain";

// Create a provider for a specific protocol (e.g., Across)
const provider = createCrossChainProvider(
    "across",
    { apiUrl: "https://..." }, // Provider config
    {}, // Dependencies
);

// Get a quote for a cross-chain transfer
const quote = await provider.getQuote("crossChainTransfer", {
    sender: "0x...", // sender address (hex)
    recipient: "0x...", // recipient address (hex)
    inputTokenAddress: "0x...", // input token address
    outputTokenAddress: "0x...", // output token address
    inputAmount: "1000000000000000000", // amount in wei
    inputChainId: 11155111, // source chain ID
    outputChainId: 84532, // destination chain ID
});

// Simulate the open transaction for the quote
const txs = await provider.simulateOpen(quote.openParams);

// Batch quotes and execution using ProviderExecutor
const providers = [provider];
const executor = createProviderExecutor(providers, {});
const quotes = await executor.getQuotes("crossChainTransfer", {
    sender: "0x...",
    recipient: "0x...",
    inputTokenAddress: "0x...",
    outputTokenAddress: "0x...",
    inputAmount: "1000000000000000000",
    inputChainId: 11155111,
    outputChainId: 84532,
});

// Execute the selected quote
const selectedQuote = quotes[0];
if (selectedQuote.preparedTransaction) {
    const hash = await walletClient.sendTransaction(selectedQuote.preparedTransaction);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
}

// Using InteropAddressParamsParser for human-readable or binary addresses
const paramParser = new InteropAddressParamsParser();
const executorWithParser = createProviderExecutor(providers, { paramParser });
const quotesWithInterop = await executorWithParser.getQuotes("crossChainTransfer", {
    sender: "alice.eth@eip155:1#ABCD1234", // human-readable interop address
    recipient: "0x...", // hex address
    amount: "1000000000000000000",
    inputTokenAddress: "0x...",
    outputTokenAddress: "0x...",
});
```

## API

### Providers

-   `createCrossChainProvider(protocolName, config, dependencies)` – Create a provider for a supported protocol (e.g., "across").
-   `CrossChainProvider` (abstract class)
    -   `.getProtocolName()` – Returns the protocol name.
    -   `.getQuote(action, params)` – Fetch a quote for a cross-chain action ("crossChainTransfer" or "crossChainSwap").
    -   `.simulateOpen(openParams)` – Simulate the open transaction for a quote.
    -   `.validateOpenParams(openParams)` – Validate open parameters.

### Provider Executor

-   `createProviderExecutor(providers, dependencies)` – Create an executor for batch quoting and execution.
-   `ProviderExecutor`
    -   `.getQuotes(action, params)` – Get quotes from all providers.
    -   `.prepareTracking(providerId)` – Prepare intent tracking for a provider.

### Param Parsers

-   `InteropAddressParamsParser` – Parses human-readable or binary interop addresses for use in cross-chain actions.
-   `ParamsParser` (interface) – Custom param parsers can be implemented for advanced use cases.

### Types

-   `GetQuoteParams<Action>` – Parameters for quoting (see `crossChainProvider.interface.ts`).
-   `GetQuoteResponse<Action, OpenParams>` – Quote response structure.
-   `BasicOpenParams`, `Fee`, and more (see exported types).

### Supported Actions

-   `crossChainTransfer` – Transfer tokens between chains.
-   `crossChainSwap` – Swap tokens across chains (if supported by the protocol).

## OIF Provider

The `OifProvider` enables integration with any [Open Intents Framework](https://docs.openintents.xyz/) compliant solver.

### Usage

```typescript
import { OifProvider } from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";

// Create provider with your solver endpoint
const provider = new OifProvider({
    solverId: "my-solver",
    url: "https://oif-api.example.com",
});

// Get quotes
const quotes = await provider.getQuotes({
    user: "0x123abc...",
    intent: {
        intentType: "oif-swap",
        inputs: [{ asset: "0x...", amount: "1000000" }],
        outputs: [{ asset: "0x...", amount: "990000" }],
        swapType: "exact-input",
    },
});

// Protocol Mode: Sign and submit order (gasless for user)
const walletClient = createWalletClient({ account, chain: base, transport: http() });
const { domain, primaryType, message, types } = quotes[0].order.payload;
const signature = await walletClient.signTypedData({ domain, primaryType, message, types });
await provider.submitSignedOrder(quotes[0], signature);

// User Mode: Execute transaction directly (user pays gas)
if (quotes[0].preparedTransaction) {
    await walletClient.sendTransaction(quotes[0].preparedTransaction);
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
