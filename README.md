# interop-sdk

This repository is a monorepo consisting of the following packages:

-   [`@wonderland/interop-addresses`](./packages/addresses/): A utility library for interoperable addresses based on ERC-7930.
-   [`@wonderland/interop-cross-chain`](./packages/cross-chain/): A library for cross-chain interoperability

## Project Structure

```
interop-sdk/
├── apps/                           # Application packages
│   ├── addresses-landing-page/    # Interoperable Addresses landing page
│   ├── docs/                      # Documentation website
│   └── sdk/                       # SDK application
├── packages/                       # Shared packages
│   ├── addresses/                 # Address-related utilities (ERC-7930/ERC-7828)
│   ├── cross-chain/               # Cross-chain interoperability
├── examples/                       # Example implementations
│   └── ui/                        # UI examples
├── .github/                       # GitHub configuration
├── .husky/                        # Git hooks
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

-   **Run E2E tests** (UI examples)

    ```bash
    pnpm --filter @examples/ui test:e2e
    ```

## Examples

### Addresses Package

The addresses package provides utilities for handling interoperable blockchain addresses across different networks.

**Address Formats:**

-   **Human-readable (Interoperable Name)**: `0x...@eip155:1#ABCD1234` - Use for display, configuration, and user-facing interfaces
-   **Binary hex**: `0x0001000000010114...` - Use for on-chain operations, ERC-7683 intents, and smart contract interactions

Both formats are interchangeable - convert between them as needed for your use case.

```typescript
import { encodeAddress, InteropAddressProvider } from "@wonderland/interop-addresses";

// Convert between human-readable (interoperable name) and binary addresses
const interoperableName = "alice.eth@eip155:1#ABCD1234";
const binaryAddress = await InteropAddressProvider.nameToBinary(interoperableName);
// Returns: "0x0001000000010114d8da6bf26964af9d7eed9e03e53415d37aa96045"

const backToName = InteropAddressProvider.binaryToName(binaryAddress);
// Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#ABCD1234"

// Get the underlying address for a chain
const address = await InteropAddressProvider.getAddress(interoperableName);
// Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

// Validate addresses
const isValid = await InteropAddressProvider.isValidInteropAddress(interoperableName);

// Create binary addresses programmatically (without parsing a name string)
const binaryHex = encodeAddress(
    {
        version: 1,
        chainType: "eip155",
        chainReference: "11155111", // Sepolia
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    },
    { format: "hex" },
);
```

### Cross-Chain Package

The cross-chain package provides a standardized interface for cross-chain operations.

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Create a provider - Across works with no config (defaults to mainnet)
// Mainnet: https://app.across.to/api
// Testnet: https://testnet.across.to/api
const provider = createCrossChainProvider("across");

// Or with custom configuration for testnet
const testnetProvider = createCrossChainProvider("across", { isTestnet: true });

// Get quotes using OIF format (addresses must be EIP-7930 binary format: 0x0001...)
// Use nameToBinary() from @wonderland/interop-addresses to convert human-readable addresses
const quotes = await provider.getQuotes({
    user: "0x0001000aa36a7114...", // binary format address
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: "0x0001000aa36a7114...",
                asset: "0x0001000aa36a7114...",
                amount: "1000000000000000000",
            },
        ],
        outputs: [{ receiver: "0x0001000149d4114...", asset: "0x0001000149d4114..." }],
        swapType: "exact-input",
    },
    supportedTypes: ["oif-escrow-v0"],
});

// OIF provider requires configuration
const oifProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://oif-api.example.com",
});
```

## Release Workflow

This project uses [changesets](https://github.com/changesets/changesets) for version management.

### During Development (Per PR)

When you make changes to any package:

1. **Make changes** to one or more packages
2. **Create changeset**: `pnpm changeset`
    - Select which packages changed
    - Choose change type (patch/minor/major)
    - Write a description of the change
3. **Commit only the changeset file** (`.changeset/random-name.md`)
4. **Open PR** and merge to dev

**Important:** Do NOT run `pnpm version-packages` during development. Changesets accumulate in `.changeset/` directory.

### At Release Time (Once, by Maintainer)

When ready to publish a new version:

1. **Apply all accumulated changesets**: `pnpm version-packages`
    - Reads all pending changesets
    - Calculates new versions
    - Updates package.json files
    - Generates/updates CHANGELOGs
    - Deletes applied changesets
2. **Commit** version bumps and CHANGELOGs
3. **Push** to GitHub
4. **Publish** via GitHub Actions (manual workflow dispatch in Actions tab)

See [.changeset/README.md](./.changeset/README.md) for more details.

## Contributing

Wonderland is a team of top Web3 researchers, developers, and operators who believe that the future needs to be open-source, permissionless, and decentralized.

[Wonderland](https://wonderland.xyz), but Wonderland is here to make it better.

### 💻 Conventional Commits

We follow the Conventional Commits [specification](https://www.conventionalcommits.org/en/v1.0.0/#specification).

## License

This project is licensed under the MIT License. See the [`LICENSE`](./LICENSE) file for details.
