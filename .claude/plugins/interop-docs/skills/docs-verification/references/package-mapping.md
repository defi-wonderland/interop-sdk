# Package to Documentation Mapping

This document maps source code locations to their corresponding documentation files.

## @interop-sdk/addresses

### Source Files
| Source | Purpose |
|--------|---------|
| `packages/addresses/src/external.ts` | Public API exports |
| `packages/addresses/src/index.ts` | Package entry point |
| `packages/addresses/src/types.ts` | Type definitions |
| `packages/addresses/src/providers/` | Address providers |
| `packages/addresses/src/resolvers/` | Address resolvers |

### Documentation Files
| Doc File | Content | Source Dependency |
|----------|---------|-------------------|
| `apps/docs/docs/addresses.md` | Package overview | README, external.ts |
| `apps/docs/docs/addresses/api.md` | API reference | external.ts, types.ts |
| `apps/docs/docs/addresses/example.md` | Usage examples | tests, external.ts |
| `apps/docs/docs/addresses/getting-started.md` | Quick start | external.ts |
| `apps/docs/docs/addresses/advanced-usage.md` | Advanced patterns | providers/*.ts |

### Key Exports to Document
From `packages/addresses/src/external.ts`:
- `InteropAddressProvider` - Main provider class
- `humanReadableToBinary` - Address conversion
- `binaryToHumanReadable` - Address conversion
- `getAddress` - Address resolution
- `isValidInteropAddress` - Validation
- Types: `InteropAddress`, `ChainId`, `AddressFormat`

## @interop-sdk/cross-chain

### Source Files
| Source | Purpose |
|--------|---------|
| `packages/cross-chain/src/external.ts` | Public API exports |
| `packages/cross-chain/src/index.ts` | Package entry point |
| `packages/cross-chain/src/types.ts` | Type definitions |
| `packages/cross-chain/src/providers/` | Cross-chain providers |
| `packages/cross-chain/src/executor.ts` | Transaction executor |

### Documentation Files
| Doc File | Content | Source Dependency |
|----------|---------|-------------------|
| `apps/docs/docs/cross-chain.md` | Package overview | README, external.ts |
| `apps/docs/docs/cross-chain/api.md` | API reference | external.ts, types.ts |
| `apps/docs/docs/cross-chain/example.md` | Usage examples | tests, external.ts |
| `apps/docs/docs/cross-chain/getting-started.md` | Quick start | external.ts |
| `apps/docs/docs/cross-chain/advanced-usage.md` | Advanced patterns | providers/*.ts |
| `apps/docs/docs/cross-chain/providers.md` | Provider setup | providers/*.ts |
| `apps/docs/docs/cross-chain/across-provider.md` | Across integration | providers/across/ |
| `apps/docs/docs/cross-chain/oif-provider.md` | OIF integration | providers/oif/ |
| `apps/docs/docs/cross-chain/flow.md` | Cross-chain flow | external.ts |
| `apps/docs/docs/cross-chain/intent-tracking.md` | Intent tracking | external.ts |

### Key Exports to Document
From `packages/cross-chain/src/external.ts`:
- `createCrossChainProvider` - Provider factory
- `createProviderExecutor` - Executor factory
- `AcrossProvider` - Across implementation
- Types: `CrossChainQuote`, `OpenParams`, `ProviderConfig`

## General Documentation

### Root Level
| Doc File | Content | Source Dependency |
|----------|---------|-------------------|
| `README.md` | Project overview | All packages |
| `apps/docs/docs/about.md` | About page | All packages |
| `apps/docs/docs/installation.md` | Setup guide | package.json, examples |

### Configuration Files
| Config | Affects |
|--------|---------|
| `packages/*/package.json` | Version numbers in docs |
| `packages/*/tsconfig.json` | Import paths |
| `pnpm-workspace.yaml` | Monorepo structure |

## Verification Matrix

When a file changes, verify these documentation files:

### If `packages/addresses/src/external.ts` changes:
- [ ] `apps/docs/docs/addresses/api.md`
- [ ] `apps/docs/docs/addresses/example.md`
- [ ] `README.md` (if major change)

### If `packages/addresses/src/types.ts` changes:
- [ ] `apps/docs/docs/addresses/api.md` (type definitions)

### If `packages/cross-chain/src/external.ts` changes:
- [ ] `apps/docs/docs/cross-chain/api.md`
- [ ] `apps/docs/docs/cross-chain/example.md`
- [ ] `README.md` (if major change)

### If `packages/cross-chain/src/providers/across/` changes:
- [ ] `apps/docs/docs/cross-chain/across-provider.md`
- [ ] `apps/docs/docs/cross-chain/providers.md`

### If `packages/cross-chain/src/providers/oif/` changes:
- [ ] `apps/docs/docs/cross-chain/oif-provider.md`
- [ ] `apps/docs/docs/cross-chain/providers.md`

### If any `package.json` version changes:
- [ ] `apps/docs/docs/installation.md` (install commands)

## Test Files as Documentation Source

Tests are authoritative sources for working examples:

| Test File | Documentation Use |
|-----------|-------------------|
| `packages/addresses/test/*.test.ts` | Address examples |
| `packages/cross-chain/test/*.test.ts` | Cross-chain examples |
| `packages/*/test/integration/*.test.ts` | Full flow examples |

### Extracting Examples from Tests
```bash
# Find test cases for a specific function
grep -A 30 "describe.*functionName" packages/addresses/test/*.test.ts

# Find usage patterns
grep -B 2 -A 10 "expect.*functionName" packages/*/test/*.test.ts
```

## Documentation Gaps Alert

If you find a public export WITHOUT documentation:
1. Check if it's intentionally internal (underscore prefix, not in external.ts)
2. If public, use AskUserQuestion to confirm it needs docs
3. Add to the appropriate documentation file
4. Include in this mapping

## Keeping This Mapping Updated

When adding new packages or files:
1. Add source files to the appropriate section
2. Add documentation file mappings
3. Update the verification matrix
4. Document key exports
