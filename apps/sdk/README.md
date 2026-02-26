# @wonderland/interop

A TypeScript library for handling interoperable blockchain addresses and cross-chain operations across different networks.

This package combines two powerful functionalities:

1. **Interoperable Addresses**: Provides methods to convert between human-readable addresses and their binary string representation, following the [ERC-7930](https://ethereum-magicians.org/t/erc-7930-interoperable-addresses/23365) standard. For backward compatibility with existing smart contracts, the package includes utilities to extract individual components (chainId and address) from the binary representation.

2. **Cross-Chain Operations**: Enables seamless token transfers and swaps between different blockchain networks through a unified API, supporting various bridge protocols.

```mermaid
graph LR
    A[interoperableName]
    C[binaryRepresentation]
    D[chainId]
    E[address]
    F[Cross-Chain Operations]
    G[Token Transfers]

    A -->|nameToBinary| C
    C -->|binaryToName| A
    C -->|getChainId| D
    C -->|getAddress| E
    F -->|Transfer| G
```

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

### Interoperable Addresses

```typescript
import { InteropAddressProvider, nameToBinary } from "@wonderland/interop";

// Using the Provider
const interoperableName = "alice.eth@eip155:1#ABCD1234";
const binaryAddress = await InteropAddressProvider.nameToBinary(interoperableName);

// Or just importing the method directly
const binaryAddress2 = await nameToBinary("alice.eth@eip155:1#ABCD1234");
```

### Cross-Chain Operations

```typescript
import { createCrossChainProvider, createProviderExecutor } from "@wonderland/interop";
import { createPublicClient, createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";

// Create a provider - Across works with no config (defaults to mainnet)
// Mainnet: https://app.across.to/api
// Testnet: https://testnet.across.to/api
const provider = createCrossChainProvider("across");

// Or with testnet config
const testnetProvider = createCrossChainProvider("across", { isTestnet: true });

// Get quotes — addresses use readable { chainId, address } objects
const executor = createProviderExecutor({ providers: [provider] });

const response = await executor.getQuotes({
    user: { chainId: 1, address: "0xYourAddress..." },
    intent: {
        inputs: [
            {
                asset: { chainId: 1, address: "0xInputToken..." },
                amount: "1000000000000000000",
            },
        ],
        outputs: [
            {
                asset: { chainId: 8453, address: "0xOutputToken..." },
            },
        ],
        swapType: "exact-input",
    },
    supportedLocks: ["oif-escrow"], // optional: filter by lock mechanism
});

const quote = response.quotes[0];
const step = quote.order.steps[0];
const walletClient = createWalletClient({
    chain: mainnet,
    transport: http("https://..."),
    account: "0x...",
});

// Option 1 - User Mode: send transaction directly (Across, OIF user-open)
if (step.kind === "transaction") {
    const hash = await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
        ...(step.transaction.value && { value: BigInt(step.transaction.value) }),
    });
}

// Option 2 - Protocol Mode: sign and submit order (OIF escrow - gasless for user)
if (step.kind === "signature") {
    const { signatureType, ...typedData } = step.signaturePayload;
    const signature = await walletClient.signTypedData(typedData);
    await executor.submitOrder(quote, signature);
}
```

## API

### Interoperable Addresses

#### [InteropAddressProvider](./src/providers/InteropAddressProvider.ts)

Available methods:

-   `nameToBinary(interoperableName: string)` – Convert human-readable address to binary format
-   `binaryToName(binaryAddress: Hex)` – Convert binary address to human-readable format
-   `getChainId(address: string)` – Extract chain ID from an address
-   `getAddress(address: string)` – Extract the underlying address
-   `encodeAddress(payload: InteroperableAddress, opts?: { format: "hex" | "bytes" })` – Create binary address from components
-   `computeChecksum(interoperableName: string)` – Compute checksum for an address

### Cross-Chain Operations

#### [createCrossChainProvider](./src/services/crossChainProviderFactory.ts)

Creates a provider for the specified protocol:

```typescript
// Across - config optional (defaults to mainnet)
const acrossProvider = createCrossChainProvider("across");
const testnetProvider = createCrossChainProvider("across", { isTestnet: true });

// OIF - config required
const oifProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://solver.example.com",
});
```

#### CrossChainProvider

All providers implement these methods:

-   `.getQuotes(params)` – Fetch quotes using SDK-friendly `QuoteRequest`. Returns `Quote[]`.
-   `.submitOrder(quote, signature)` – Submit a signed order. Throws `ProviderExecuteNotImplemented` by default (only OIF implements this).
-   `.getProtocolName()` – Returns the protocol name.
-   `.getProviderId()` – Returns the provider identifier.
-   `.getTrackingConfig()` – Get configuration for intent tracking.

#### [ProviderExecutor](./src/services/providerExecutor.ts)

For comparing quotes across multiple providers:

```typescript
import { createProviderExecutor } from "@wonderland/interop";

const executor = createProviderExecutor({
    providers: [acrossProvider, oifProvider],
});

// Returns { quotes: ExecutableQuote[], errors: GetQuotesError[] }
const response = await executor.getQuotes({
    user: { chainId: 1, address: "0xYourAddress..." },
    intent: {
        inputs: [{ asset: { chainId: 1, address: "0xInputToken..." }, amount: "1000000" }],
        outputs: [{ asset: { chainId: 8453, address: "0xOutputToken..." } }],
        swapType: "exact-input",
    },
});

const bestQuote = response.quotes[0]; // Sorted by best output
```

Supported protocols:

-   Across Protocol
-   OIF (Open Intents Framework)
-   More protocols coming soon...

## References

-   [ERC 7930: Interoperable Addresses](https://ethereum-magicians.org/t/erc-7930-interoperable-addresses/23365)
-   [Open Intents Framework](https://docs.openintents.xyz/) - OIF API specification
-   [Viem Documentation](https://viem.sh/) - Low-level Ethereum interface used for transaction handling
-   [Zod Documentation](https://zod.dev/) - TypeScript-first schema validation used for input validation
-   [Cross-Chain Interoperability Standards](https://ethereum.org/en/developers/docs/bridges/) - Overview of cross-chain bridge concepts
