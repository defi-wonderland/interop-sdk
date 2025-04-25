# ts-turborepo-boilerplate

## Features

### Boilerplate monorepo setup

Quickly start developing your offchain monorepo project with
minimal configuration overhead using Turborepo

### Sample library with Viem

Simple provider that uses Viem client to query account balances

### Sample contracts with Foundry

Basic Greeter contract with an external interface

Foundry configuration out-of-the-box

### Sample app that consumes the library

How much ETH do Vitalik and the Zero address hold together?

### Testing

Unit test setup with Vitest framework

### Lint and format

Use ESLint and Prettier to easily find issues as you code

### Github workflows CI

Lint code and check commit messages format on every push.

Run all tests and see the coverage before merging changes.

## Overview

This repository is a monorepo consisting of 2 packages and 1 app:

-   [`@ts-turborepo-boilerplate/contracts`](./packages/contracts): A library for writing all required smart contracts
-   [`@ts-turborepo-boilerplate/sample-lib`](./packages/sample-lib): A sample library for querying account balances
-   [`@ts-turborepo-boilerplate/sample-app`](./apps/sample-app): A demo sample app that uses the sample-lib

## 📋 Prerequisites

-   Ensure you have `node 20` and `pnpm 9.7.1` installed.

## Tech stack

-   [pnpm](https://pnpm.io/): package and workspace manager
-   [turborepo](https://turbo.build/repo/docs): for managing the monorepo and the build system
-   [foundry](https://book.getfoundry.sh/forge/): for writing Solidity smart contracts
-   [husky](https://typicode.github.io/husky/): tool for managing git hooks
-   tsc: for transpiling TS and building source code
-   [prettier](https://prettier.io/): code formatter
-   [eslint](https://typescript-eslint.io/): code linter
-   [vitest](https://vitest.dev/): modern testing framework
-   [Viem](https://viem.sh/): lightweight library to interface with EVM based blockchains

### Configuring Prettier sort import plugin

You can further add sorting rules for your monorepo, for example in `.prettierrc` you can add:

```json
    ...
    "importOrder": [
        "<TYPES>",
        ...
        "",
        "<TYPES>^@myproject", //added
        "^@myproject/(.*)$", //added
        "",
        ...
    ],
    ...
```

We use [IanVs prettier-plugin-sort-imports](https://github.com/IanVS/prettier-plugin-sort-imports)

## Available Scripts

### `create-package`

The `create-package` script allows you to create a new package within the `packages` directory. It automates the setup of a new package with the necessary directory structure and initial files scaffolded.

#### Usage

To create a new package, run the following command:

```bash
pnpm run create-package <package-name>
```

Replace `<package-name>` with your desired package name. This command will generate the package directory with predefined templates and configuration files.

## Contributing

Wonderland is a team of top Web3 researchers, developers, and operators who believe that the future needs to be open-source, permissionless, and decentralized.

[DeFi sucks](https://defi.sucks), but Wonderland is here to make it better.

### 💻 Conventional Commits

We follow the Conventional Commits [specification](https://www.conventionalcommits.org/en/v1.0.0/#specification).

## License

The primary license for the boilerplate is MIT. See the [`LICENSE`](./LICENSE) file for details.
