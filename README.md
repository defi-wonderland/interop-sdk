# interop-sdk

This repository is a monorepo consisting of the following packages:

-   [`@interop-sdk/addresses`](./packages/addresses/): A utility library for interoperable addresses based on ERC-7930.
-   [`@interop-sdk/cross-chain`](./packages/cross-chain/): A library for cross-chain interoperability.

## Project Structure

```
interop-sdk/
├── apps/              # Application packages
│   ├── docs/         # Documentation website
│   └── sdk/          # SDK application
├── packages/          # Shared packages
│   ├── addresses/    # Address-related utilities
│   └── cross-chain/  # Cross-chain interoperability
├── .github/          # GitHub configuration
├── .husky/           # Git hooks
└── ...config files
```

## Prerequisites

-   Node.js 20.x
-   pnpm 9.7.1 or later

## Getting Started

1. **Install dependencies**

    ```bash
    pnpm install
    ```

2. **Build all packages**
    ```bash
    pnpm build
    ```

## Development

-   **Format code**

    ```bash
    pnpm format
    ```

-   **Run tests**
    ```bash
    pnpm test
    ```

## Examples

### Addresses Package

The addresses package provides utilities for handling interoperable blockchain addresses across different networks.

```typescript
import { InteropAddressProvider } from "@interop-sdk/addresses";

// Convert between human-readable and binary addresses
const humanReadableAddress = "alice.eth@eip155:1#ABCD1234";
const binaryAddress = await InteropAddressProvider.humanReadableToBinary(humanReadableAddress);
const backToHumanReadable = await InteropAddressProvider.binaryToHumanReadable(binaryAddress);

// Get the underlying address for a chain
const address = await InteropAddressProvider.getAddress(humanReadableAddress);
// Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

// Validate addresses
const isValid = await InteropAddressProvider.isValidInteropAddress(humanReadableAddress);
```

### Cross-Chain Package

The cross-chain package provides a standardized interface for cross-chain operations.

```typescript
import {
    createCrossChainProvider,
    createProviderExecutor,
    InteropAddressParamsParser,
} from "@interop-sdk/cross-chain";

// Create a provider for a specific protocol (e.g., Across)
const provider = createCrossChainProvider("across");

// Get a quote for a cross-chain transfer
const quote = await provider.getQuote("crossChainTransfer", {
    sender: "0x...", // sender address
    recipient: "0x...", // recipient address
    inputTokenAddress: "0x...", // input token address
    outputTokenAddress: "0x...", // output token address
    inputAmount: "1000000000000000000", // amount in wei
    inputChainId: 11155111, // source chain ID
    outputChainId: 84532, // destination chain ID
});
```

## Contributing

Wonderland is a team of top Web3 researchers, developers, and operators who believe that the future needs to be open-source, permissionless, and decentralized.

[DeFi sucks](https://defi.sucks), but Wonderland is here to make it better.

### 💻 Conventional Commits

We follow the Conventional Commits [specification](https://www.conventionalcommits.org/en/v1.0.0/#specification).

## License

This project is licensed under the MIT License. See the [`LICENSE`](./LICENSE) file for details.
