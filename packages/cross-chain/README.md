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
// Across - config optional (defaults to mainnet: https://app.across.to/api)
// Testnet: https://testnet.across.to/api
const acrossProvider = createCrossChainProvider("across");

// Across with testnet config
const testnetProvider = createCrossChainProvider("across", { isTestnet: true });

// OIF - config required
const oifProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://...",
});

// Create executor with providers (can mix Across, OIF, etc.)
const executor = createProviderExecutor({
    providers: [acrossProvider, oifProvider],
});

// Get quotes using OIF GetQuoteRequest format
// Addresses must be EIP-7930 binary format (0x0001...)
// Use nameToBinary() from @wonderland/interop-addresses to convert
const response = await executor.getQuotes({
    user: "0x0001000aa36a7114...",
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: "0x0001000aa36a7114...",
                asset: "0x0001000aa36a7114...",
                amount: "1000000000000000000",
            },
        ],
        outputs: [
            {
                receiver: "0x0001000149d4114...",
                asset: "0x0001000149d4114...",
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

-   `createCrossChainProvider(protocolName, config?)` – Create a provider for a supported protocol. Config is optional for Across (defaults to mainnet), required for OIF.
-   `CrossChainProvider` (abstract class)
    -   `.getProtocolName()` – Returns the protocol name.
    -   `.getProviderId()` – Returns the provider identifier.
    -   `.getQuotes(params)` – Fetch quotes for a cross-chain request (OIF GetQuoteRequest format).
    -   `.submitSignedOrder(quote, signature)` – Submit a signed order to the provider (throws MethodNotImplemented for providers that don't support it, like Across).
    -   `.getTrackingConfig()` – Get configuration for order tracking.

### Tracking Notes (Across)

-   **Mainnet**: fill tracking defaults to **API-based polling** via the Across API.
-   **Testnet**: fill tracking defaults to **event-based watching** (Across testnet API is not reliable).
-   The SDK still parses the **origin-chain open event**, so provide an origin-chain RPC URL for robust tracking.

### Provider Executor

-   `createProviderExecutor(config)` – Create an executor for batch quoting and execution.
    -   Config: `{ providers: CrossChainProvider[], sortingStrategy?, timeoutMs?, trackerFactory? }`
-   `ProviderExecutor`
    -   `.getQuotes(params)` – Get quotes from all providers (params: GetQuoteRequest, returns: GetQuotesResponse).
    -   `.prepareTracking(providerId)` – Prepare order tracking for a provider.
    -   `.track(params)` – Track an existing transaction.
    -   `.getOrderStatus(params)` – Get current status without watching.

### Asset Discovery

The SDK provides utilities to discover supported assets from providers. All discovery methods return a pre-processed `DiscoveredAssets` structure ready for consumption.

**Via ProviderExecutor (recommended):**

```typescript
import { toChainIdentifier } from "@wonderland/interop-addresses";
import { createProviderExecutor } from "@wonderland/interop-cross-chain";

const executor = createProviderExecutor({ providers: [acrossProvider] });

// Discover assets from all configured providers
const discovered = await executor.discoverAssets({ chainIds: [1, 42161] });

// Get tokens for Ethereum using CAIP-350 chain identifier
const ethTokens = discovered.tokensByChain[toChainIdentifier(1)]; // "eip155:1"

// Get metadata for a specific token (flat lookup by interop address)
const usdc = discovered.tokenMetadata["0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"];
console.log(usdc.symbol); // "USDC"
console.log(usdc.decimals); // 6
```

**Via individual service:**

```typescript
import { toChainIdentifier } from "@wonderland/interop-addresses";
import { createAssetDiscoveryService } from "@wonderland/interop-cross-chain";

const service = createAssetDiscoveryService(provider);
const discovered = await service.getSupportedAssets(); // Returns DiscoveredAssets directly

const ethTokens = discovered.tokensByChain[toChainIdentifier(1)];
```

**Key concepts:**

-   **CAIP-350 chain identifiers**: Chain identifiers use CAIP-350 format (e.g., `"eip155:1"` for Ethereum mainnet). Use `toChainIdentifier(numericChainId)` from `@wonderland/interop-addresses` to convert from viem's numeric chain ID.
-   **EIP-7930 interop addresses**: All addresses in `tokensByChain` and `tokenMetadata` use the EIP-7930 interoperable format. Use `decodeAddress` from `@wonderland/interop-addresses` when you need the plain `0x` address for display or wallet interaction.
-   **Flat metadata**: `tokenMetadata` is keyed directly by interop address (globally unique), not nested by chain.

**Types:**

-   `DiscoveredAssets` – Aggregated discovery result with `tokensByChain`, `tokenMetadata`, and `chainIds`.
-   `AssetInfo` – Token metadata: `{ address, symbol, decimals }`.

### Types

-   `GetQuoteRequest` – OIF-compliant quote request (see `@openintentsframework/oif-specs`).
-   `GetQuotesResponse` – Response containing `{ quotes: ExecutableQuote[], errors: GetQuotesError[] }`.
-   `ExecutableQuote` – Quote with optional `preparedTransaction` for execution.
-   `ProviderExecutorConfig`, `OrderTrackerConfig`, and more (see exported types).

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
const provider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://...",
});

// Get quotes using OIF GetQuoteRequest format
// Addresses must be EIP-7930 binary format (0x0001...)
const response = await provider.getQuotes({
    user: "0x00010000000114...",
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: "0x00010000000114...",
                asset: "0x00010000000114...",
                amount: "1000000",
            },
        ],
        outputs: [
            {
                receiver: "0x00010000000114...",
                asset: "0x00010000000114...",
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
// Protocol mode (oif-escrow-v0)
const spender = quote.order.payload.message.spender;

// User mode (oif-user-open-v0)
const { spender, token, required } = quote.order.checks.allowances[0];
```

## Payload Validation

The SDK validates that calldata from solver APIs matches the user's intent. For Across, simple same-token bridges are fully validated (depositor, recipient, tokens, amount, chain). Cross-chain swap validation is coming soon.

## References

-   [Open Intents Framework](https://docs.openintents.xyz/) - OIF API specification and documentation
-   [Viem Documentation](https://viem.sh/) - Low-level Ethereum interface used for transaction handling
-   [Zod Documentation](https://zod.dev/) - TypeScript-first schema validation used for input validation
-   [Cross-Chain Interoperability Standards](https://ethereum.org/en/developers/docs/bridges/) - Overview of cross-chain bridge concepts

The current SDK uses Across on testnet for demo purposes only. Performance may not reflect mainnet behavior and is not representative of the final production experience
