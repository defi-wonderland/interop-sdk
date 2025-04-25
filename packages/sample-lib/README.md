# ts-turborepo-boilerplate: sample-lib package

> Note: use this lib as reference but preferred way is to re-write package
> from zero instead of refactoring this one.
> When you don't need this anymore, you can delete it

Sample library that exposes a Blockchain provider to query
account balances on Ethereum mainnet or EVM-compatible blockchains

## Setup

1. Change package name to your own in [`package.json`](./package.json)
2. Install dependencies running `pnpm install`

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

### Importing the Package

You can import the package in your TypeScript or JavaScript files as follows:

```typescript
import { BlockchainProvider } from "@ts-turborepo-boilerplate/sample-lib";
```

### Example

```typescript
// EVM-provider
const rpcUrl = ""; //non-empty valid url
const address = "0x...";

const provider = new BlockchainProvider(rpcUrl);

const balance = await provider.getBalance(address);

console.log(`Balance of ${address} is ${balance}`);
```

## API

### [IBlockchainProvider](./src/interfaces/blockchainProvider.interface.ts)

Available methods

-   `getBalance(address: Address)`

## References

-   [Viem](https://viem.sh/)
-   [Offchain docs: Internal module pattern](https://www.notion.so/defi-wonderland/Best-Practices-c08b71f28e59490f8dadef64cf61c9ac?pvs=4#89f99d33053a426285bacc6275d994c0)
