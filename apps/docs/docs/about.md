---
slug: "/"
title: Interop SDK
---

:::warning Beta — under active development
APIs may change between releases. We're shipping quickly and welcome bug reports and feedback via [GitHub Issues](https://github.com/defi-wonderland/interop-sdk/issues).
:::

The _Interop SDK_ is a TypeScript library for cross-chain applications. It brings the latest interoperability standards to wallet and app developers who want to provide seamless multichain experiences.

## Modules

### [`addresses`](./addresses)

Parse, encode, and resolve **interoperable addresses** — a format that combines an address, chain, and optional ENS name into a single string (e.g., `alice.eth@eip155:1`).

Implements [EIP-7930](https://eips.ethereum.org/EIPS/eip-7930), [ERC-7828](https://eips.ethereum.org/EIPS/eip-7828), and [CAIP-350](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-350.md).

### [`cross-chain`](./cross-chain)

Fetch quotes, execute transfers, and track orders across chains through a unified provider interface.

Supports Open Intents Framework (OIF), Across, Relay, Bungee, and LiFi Intents providers.

## Where to start

| I want to...                   | Go to                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Install the packages           | [Installation](./installation)                                                               |
| Parse an interoperable address | [Addresses — Getting Started](./addresses/getting-started)                                   |
| Send a cross-chain transfer    | [Cross-Chain — Getting Started](./cross-chain/getting-started)                               |
| Understand the architecture    | [Addresses Concepts](./addresses/concepts) or [Cross-Chain Concepts](./cross-chain/concepts) |

## Who it's for

-   Wallets that want to offer native cross-chain transfers
-   Payment UIs or checkout flows with multichain support
-   Cross-chain bots, agents, or automation systems
-   Any app that wants seamless multichain experiences
