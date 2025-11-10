# Interop Addresses - UI Demo

Interactive Next.js application demonstrating Interop Addresses (ERC-7930).

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

## Development

```bash
# Format code
pnpm format

# Lint code
pnpm lint:fix
```

## Features

This demo showcases:

- **Interopable Addresses**: ERC-7930 address conversion and validation
- **Human-Readable Format**: `alice.eth@eip155:1#ABCD1234`
- **Binary Format**: Encoded byte representation
- **Address Validation**: Check validity of interop addresses

## Documentation

- [SDK Documentation](../../apps/docs/)
- [Addresses Package](../../packages/addresses/)
