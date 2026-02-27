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
import { createAggregator, createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Create a provider - Across works with no config (defaults to mainnet)
// Mainnet: https://app.across.to/api
// Testnet: https://testnet.across.to/api
const provider = createCrossChainProvider("across");

// Or with custom configuration for testnet
const testnetProvider = createCrossChainProvider("across", { isTestnet: true });

// OIF provider requires configuration
const oifProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://oif-api.example.com",
});

// Create an aggregator to get quotes from multiple providers
const aggregator = createAggregator({ providers: [provider, oifProvider] });

const response = await aggregator.getQuotes({
    user: "0xYourAddress...",
    input: {
        asset: { chainId: 1, address: "0xInputToken..." },
        amount: "1000000000000000000",
    },
    output: {
        asset: { chainId: 8453, address: "0xOutputToken..." },
    },
    swapType: "exact-input",
});

const quote = response.quotes[0];
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

This project is maintained by [Wonderland](https://wonderland.xyz) — a team of top Web3 researchers, developers, and operators who believe that the future needs to be open-source, permissionless, and decentralized. We welcome outside contributions.

-   **Large changes** — please open an issue first to discuss your proposal before investing time in a PR.
-   **Small changes** (bug fixes, typos, minor improvements) — PRs are welcome directly.

### Submitting a Pull Request

1. Fork the repo and create your branch from `dev`.
2. Make your changes and ensure `pnpm build`, `pnpm lint`, and `pnpm test` pass.
3. If your change modifies a publishable package (`packages/addresses`, `packages/cross-chain`, or `apps/sdk`), create a changeset:
    ```bash
    pnpm changeset
    ```
    Select the affected packages, choose the appropriate bump level (patch / minor / major), and write a short description. Commit the generated `.changeset/*.md` file with your PR.
4. If your change adds or modifies public API surface, update the relevant documentation:
    - Package README (`packages/*/README.md`)
    - Docs site (`apps/docs/docs/`)
    - Inline JSDoc on exported functions and types
5. Run `/review-interop-sdk` (see below) to catch common issues before requesting human review.
6. Open your PR against `dev` and fill in the template.

### 💻 Conventional Commits

We follow the Conventional Commits [specification](https://www.conventionalcommits.org/en/v1.0.0/#specification).

### 🔍 Code Review Skill

This repo includes a shared review skill at [`.claude/skills/review-interop-sdk/`](./.claude/skills/review-interop-sdk/). Invoke it from any compatible AI agent to get a project-aware review of your changes:

```
/review-interop-sdk
```

It checks the current branch diff (or a specific PR) against the project's TypeScript rules, changeset policy, documentation requirements, and test coverage expectations.

## License

This project is licensed under the MIT License. See the [`LICENSE`](./LICENSE) file for details.
