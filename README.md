# interop-sdk

This repository is a monorepo consisting of the following packages:

-   [`@interop-sdk/addresses`](./packages/addresses/): A utility library for interoperable addresses based on ERC-7930.

## Project Structure

```
interop-sdk/
├── apps/              # Application packages
│   └── sample/        # Sample application
├── packages/          # Shared packages
│   └── addresses/     # Address-related utilities
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

## License

This project is licensed under the MIT License. See the [`LICENSE`](./LICENSE) file for details.
