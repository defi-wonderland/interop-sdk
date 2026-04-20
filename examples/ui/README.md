# Interoperable Addresses - Interactive Demo

Educational demo showcasing ERC-7930 (Binary) and ERC-7828 (Interoperable Name) interoperable address formats.

## Getting Started

```bash
# From root (recommended)
pnpm install
pnpm --filter @examples/ui dev

# Or from this directory
cd examples/ui
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Running E2E Tests

```bash
# From root
pnpm --filter @examples/ui test:e2e

# Or from this directory
cd examples/ui
pnpm test:e2e
```

Playwright boots an `anvil` fork of Base Sepolia via
`scripts/start-anvil-fork.mjs`. The script resolves the RPC's `latest` block
and pins the fork to `latest - 32` so the boot sequence stays inside the
retention window of public full-node RPCs (which typically prune after
~128 blocks).

Optional environment variables (set in `.env.e2e` or exported):

| Variable                  | Default                                   | Purpose                                                    |
| ------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `ANVIL_FORK_RPC`          | `https://base-sepolia-rpc.publicnode.com` | Upstream RPC used by anvil's fork.                         |
| `ANVIL_PORT`              | `8545`                                    | Port anvil listens on; must match `NEXT_PUBLIC_ANVIL_URL`. |
| `ANVIL_FORK_BLOCK_OFFSET` | `32`                                      | Blocks behind `latest` to pin the fork.                    |
| `ANVIL_FORK_BLOCK`        | _(unset)_                                 | Hard-pin the fork block, bypassing the offset.             |

If the default RPC is misbehaving, override it:

```bash
ANVIL_FORK_RPC=https://my-archive-rpc.example pnpm test:e2e
```

## Features

### Interactive Playground

- **Dual Input Modes**: Enter a complete interoperable name OR build from address + chain
- **Live Conversion**: Real-time conversion between ERC-7930 and ERC-7828 formats
- **Component Breakdown**: Visual breakdown of address parts with hover interactions
- **Copy to Clipboard**: One-click copy of generated addresses
- **Example Addresses**: Pre-filled valid examples for quick testing

### Educational Focus

- **Format Explanations**: Clear descriptions of what each format represents
- **Binary Structure**: Detailed view of binary encoding with all fields
- **Interactive Hovers**: Hover over any component to highlight related parts
- **Theme Support**: Light and dark themes for comfortable viewing

### Format Support

- **Binary (ERC-7930)**: Compact byte representation for on-chain efficiency
- **Interoperable Name (ERC-7828)**: `0xAddress@chainType:chainRef#checksum`
- **EVM Chains**: Supports eip155 chain type for Ethereum and EVM-compatible chains ([CAIP-2 spec](https://chainagnostic.org/CAIPs/caip-2))
- **ENS Names**: Full support for ENS resolution (e.g., `vitalik.eth@eip155:1#checksum`)

## Tech Stack

- Next.js 15 with Turbopack
- TypeScript
- Tailwind CSS
- @wonderland/interop-addresses
- Playwright

## Documentation

- [SDK Documentation](../../apps/docs/)
- [Addresses Package](../../packages/addresses/)
- [ERC-7930 Specification](https://eips.ethereum.org/EIPS/eip-7930)
- [ERC-7828 Specification](https://eips.ethereum.org/EIPS/eip-7828)
