# interop-sdk

This repository is a monorepo consisting of the following packages:

-   [`@defi-wonderland/addresses`](./packages/addresses/): A utility library for interoperable addresses based on ERC-7930.
-   [`@defi-wonderland/cross-chain`](./packages/cross-chain/): A toolkit for cross-chain interoperability.

## Project Structure

```
interop-sdk/
├── apps/              # Application packages
│   └── docs/          # Docs site
├── packages/          # Shared packages
│   └── addresses/     # Address-related utilities
│   └── cross-chain/   # Cross-chain utilities
├── .github/           # GitHub configuration
├── .husky/            # Git hooks
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

## Docs

Checkout the [documentation](https://interop-sdk.vercel.app) for guides and examples on how to get started and use the libraries effectively

## Contributing

Wonderland is a team of top Web3 researchers, developers, and operators who believe that the future needs to be open-source, permissionless, and decentralized.

[DeFi sucks](https://defi.sucks), but Wonderland is here to make it better.

### 💻 Conventional Commits

We follow the Conventional Commits [specification](https://www.conventionalcommits.org/en/v1.0.0/#specification).

## License

This project is licensed under the MIT License. See the [`LICENSE`](./LICENSE) file for details.
