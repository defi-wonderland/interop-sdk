---
title: Addresses
---

:::warning Beta — under active development
APIs may change between releases. We're shipping quickly and welcome bug reports and feedback via [GitHub Issues](https://github.com/defi-wonderland/interop-sdk/issues).
:::

Ethereum is multichain. An address like `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` doesn't tell you _which_ chain it's on — and sending to the right address on the wrong chain can mean lost funds.

Interoperable addresses fix this by encoding the **address and the chain together**, so every recipient is unambiguous.

## What it looks like

**For people** — [ERC-7828](https://eips.ethereum.org/EIPS/eip-7828) gives you a readable name that includes the chain:

```
vitalik.eth@ethereum
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:10#1A2B3C4D
```

These names support ENS, chain shortnames (like `ethereum` or `base`), and checksums to catch errors.

**For smart contracts** — [EIP-7930](https://eips.ethereum.org/EIPS/eip-7930) gives you a compact binary format optimized for onchain use:

```
0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045
```

Both formats carry the same information and convert back and forth losslessly.

## Quick example

```typescript
import { getAddress, getChainId, parseName } from "@wonderland/interop-addresses";

// Parse a human-readable name into its components
const result = await parseName("vitalik.eth@eip155:1");
// → address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
// → chain:   eip155:1 (Ethereum mainnet)

// Or grab just the parts you need
const address = await getAddress("vitalik.eth@eip155:1");
const chainId = await getChainId("vitalik.eth@eip155:1");
```

## What the package does

-   **Parse** human-readable names like `vitalik.eth@ethereum` into addresses and chain IDs
-   **Encode/decode** compact binary addresses for smart contracts
-   **Resolve** ENS names and chain shortnames automatically
-   **Validate** checksums to catch typos and tampering
-   **Convert** between human-readable, structured, and binary formats

## Where to start

| I want to...                 | Go to                                                   |
| ---------------------------- | ------------------------------------------------------- |
| Try it out                   | [Getting Started](./addresses/getting-started.md)       |
| Understand the standards     | [Concepts](./addresses/concepts.md)                     |
| See a real-world walkthrough | [Parsing an Interoperable Name](./addresses/example.md) |
| Learn advanced patterns      | [Advanced Usage](./addresses/advanced-usage.md)         |
| Look up a function signature | [API Reference](./addresses/api.md)                     |
