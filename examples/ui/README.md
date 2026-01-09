# Interoperable Addresses - Interactive Demo

Educational demo showcasing ERC-7930 (Human-Readable) and ERC-7828 (Binary) interoperable address formats.

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

## Features

### Interactive Playground
- **Dual Input Modes**: Enter a complete human-readable address OR build from address + chain
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
- **Human-Readable (ERC-7930)**: `0xAddress@chainType:chainRef#checksum`
- **Binary (ERC-7828)**: Compact byte representation for on-chain efficiency
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
