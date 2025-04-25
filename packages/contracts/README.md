# ts-turborepo-boilerplate: Contracts package

> Note: in case you don't require writing contracts, it's recommended 
to delete this package. Also delete Foundry install from your GH workflow setup

Starter package for starting to write you Solidity smart contracts
using Foundry in seconds. It contains a basic Greeter contract with 
an external interface

## Setup
1. Change package name to your own in [`package.json`](./package.json)
2. Install dependencies running `pnpm install`

## Available Scripts

Available scripts that can be run using `pnpm`:

| Script          | Description                                                  |
| --------------  | ------------------------------------------------------------ |
| `build`         | Build contracts using Foundry's forge                        |
| `lint`          | Run forge fmt and solhint on all contracts                   |
| `lint:fix`      | Run linter and automatically fix code formatting issues.     |
| `lint:sol-logic`| Run forge fmt and solhint on contracts                       |
| `lint:sol-tests`| Run forge fmt and solhint on test contracts                  |
| `format:check`  | Check code formatting and linting without making changes.    |
| `test`          | Run tests using forge                                        |
| `test:cov`      | Run tests with coverage report                               |


### Finding compiled contracts output
By default, forge writes output to [out](./out) folder which is not git-tracked.
There you can find all contracts output including their respective ABIs,
deployment bytecode and more stuff


## References
- [Foundry docs](https://book.getfoundry.sh/forge/)
- [Foundry repo](https://github.com/foundry-rs)