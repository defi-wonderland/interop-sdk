# @wonderland/interop-cross-chain-v2

Intent-based cross-chain swap SDK. Aggregates quotes from multiple protocols (OIF, Across, Relay) behind a unified interface, gives wallets full control over transaction signing, and provides flexible tracking.

## Install

```bash
pnpm add @wonderland/interop-cross-chain-v2
```

## Quick start

```typescript
import { SwapIntentAggregator } from "@wonderland/interop-cross-chain-v2";

const aggregator = SwapIntentAggregator.create({
  oif: {
    solvers: [{ solverId: "my-solver", url: "https://solver.example.com" }],
    variants: ["escrow", "user-open"],
  },
  across: true,
  relay: true,
});

// 1. Get quotes from all protocols
const { quotes, errors } = await aggregator.quote({
  user: "0xYourAddress",
  input: { chainId: 1, token: "0xA0b8...3606eb48", amount: 1000000n }, // 1 USDC
  output: { chainId: 10, token: "0x0b2C...96a1f0D5" },
});

// 2. Pick the best quote (sorted by output amount by default)
const best = quotes[0];

// 3. Submit and track (see scenarios below for different approaches)
```

---

## Architecture overview

```
┌─────────────────────────────────────────────────┐
│               SwapIntentAggregator               │
│  quote() → prepare() → confirm() → track()      │
└────────┬──────────┬──────────┬──────────┬────────┘
         │          │          │          │
    OIFEscrow  OIFUserOpen  AcrossSwap  RelaySwap
         │          │          │          │
      OIFClient  OIFClient  AcrossClient RelayClient
```

Each **intent** implements the full lifecycle:

| Method | What it does |
|--------|-------------|
| `quote(params)` | Fetch quotes from the protocol |
| `prepare(quote)` | Return the raw action (tx or EIP-712 sign) for the wallet |
| `confirm(quote, result)` | Post-submit work (e.g. post signed order to solver), return tracking ref |
| `submit(quote, ctx)` | Convenience: prepare → execute → confirm in one call |
| `getStatus(ref)` | One-shot status check |
| `track(ref)` | Auto-polling async generator |

---

## Scenarios

### Scenario 1: Script / Bot — Simple submit

For scripts, bots, or backends where you control the signer directly.

```typescript
import { SwapIntentAggregator } from "@wonderland/interop-cross-chain-v2";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const wallet = createWalletClient({
  account: privateKeyToAccount("0x..."),
  chain: mainnet,
  transport: http(),
});

const aggregator = SwapIntentAggregator.create({
  across: true,
  relay: true,
});

const { quotes } = await aggregator.quote({
  user: wallet.account.address,
  input: { chainId: 1, token: "0xA0b8...USDC", amount: 5_000_000n },
  output: { chainId: 42161, token: "0xaf88...USDC" },
});

const best = quotes[0];

// submit() handles prepare → sign → confirm internally
const ref = await aggregator.submit(best, {
  type: "tx",
  sendTransaction: async (action) => {
    const hash = await wallet.sendTransaction({
      to: action.to,
      data: action.data,
      value: action.value,
      chain: mainnet,
    });
    return hash;
  },
});

// Poll until done
for await (const update of aggregator.track(ref)) {
  console.log(`[${update.status}] ${update.message}`);
}
```

### Scenario 2: Wallet integration — Full control with prepare/confirm

For wallets (MetaMask, Rabby, etc.) that need full control over the UX flow.

```typescript
const { quotes } = await aggregator.quote(params);
const best = quotes[0];

// ── Step 1: Handle approvals ──
if (best.approvals?.length) {
  for (const approval of best.approvals) {
    // Show approval UI, then send approve tx
    await wallet.writeContract({
      address: approval.token,
      abi: erc20Abi,
      functionName: "approve",
      args: [approval.spender, approval.amount],
    });
  }
}

// ── Step 2: Get the raw action ──
const action = aggregator.prepare(best);

// ── Step 3: Execute based on action type ──
let result;

if (action.type === "tx") {
  // Show confirmation UI: "Send 1 USDC on Ethereum → Optimism"
  const txHash = await wallet.sendTransaction({
    to: action.to,
    data: action.data,
    value: action.value,
    chain: getChain(action.chainId),
  });
  result = { type: "tx" as const, txHash };
} else {
  // EIP-712 signature (e.g. OIF escrow orders)
  const signature = await wallet.signTypedData(action.typedData);
  result = { type: "sign" as const, signature };
}

// ── Step 4: Confirm — SDK does post-submit work ──
const ref = await aggregator.confirm(best, result);

// ── Step 5: Track ──
for await (const update of aggregator.track(ref)) {
  updateUI(update.status, update.message);
}
```

### Scenario 3: EIP-712 signing (OIF Escrow orders)

OIF escrow orders don't send an on-chain transaction — they sign a typed data payload and post it to the solver. The SDK handles this transparently:

```typescript
const aggregator = SwapIntentAggregator.create({
  oif: {
    solvers: [{ solverId: "solver-1", url: "https://solver1.example.com" }],
    variants: ["escrow"], // sign-based only
  },
});

const { quotes } = await aggregator.quote(params);
const best = quotes[0]; // best.submission === "sign"

const action = aggregator.prepare(best);
// action.type === "sign"
// action.typedData contains the EIP-712 domain, types, message

const signature = await wallet.signTypedData(action.typedData);

// confirm() posts the signed order to the solver's API
const ref = await aggregator.confirm(best, { type: "sign", signature });

for await (const update of aggregator.track(ref)) {
  console.log(update.status); // submitted → pending → filled → finalized
}
```

### Scenario 4: Event-driven tracking (callbacks)

For UIs that prefer event-driven updates instead of generators.

```typescript
const ref = await aggregator.submit(best, ctx);

const stop = aggregator.startTracking(ref, {
  onUpdate: (update) => {
    console.log(`Status: ${update.status}`);
    setBadge(update.status);
  },
  onDone: (finalUpdate) => {
    showToast(`Swap complete! Fill tx: ${finalUpdate.fillTxHash}`);
  },
  onError: (error) => {
    showToast(`Tracking failed: ${error.message}`);
  },
});

// Call stop() to cancel tracking (e.g. user navigates away)
// stop();
```

### Scenario 5: One-shot status check

For recovering tracking after a page reload or process restart.

```typescript
import type { TrackingRef } from "@wonderland/interop-cross-chain-v2";

// TrackingRef is serializable — persist it however you want
const savedRef: TrackingRef = JSON.parse(localStorage.getItem("pendingSwap")!);

// Re-create the aggregator with the same protocols
const aggregator = SwapIntentAggregator.create({ across: true, relay: true });

// One-shot check
const status = await aggregator.getStatus(savedRef);
console.log(status); // { status: "finalized", fillTxHash: "0x...", ... }

// Or resume auto-polling
if (status.status === "pending") {
  for await (const update of aggregator.track(savedRef)) {
    console.log(update.status);
  }
}
```

### Scenario 6: Multiple OIF solvers

Compare quotes across multiple OIF solvers and intent variants simultaneously.

```typescript
const aggregator = SwapIntentAggregator.create({
  oif: {
    solvers: [
      { solverId: "solver-alpha", url: "https://alpha.solver.io" },
      { solverId: "solver-beta", url: "https://beta.solver.io" },
      { solverId: "solver-gamma", url: "https://gamma.solver.io" },
    ],
    variants: ["escrow", "user-open"],
    // → 3 solvers × 2 variants = 6 intents queried in parallel
  },
  across: true,
  relay: true,
});

const { quotes, errors } = await aggregator.quote(params);
// quotes sorted by best output amount, across all 8 sources
// errors tells you which sources failed and why
```

### Scenario 7: Pre-flight asset filtering

Skip protocols that don't support the requested token pair, avoiding unnecessary API calls.

```typescript
const aggregator = SwapIntentAggregator.create({
  oif: {
    solvers: [{ solverId: "solver-1", url: "https://solver.example.com" }],
  },
  across: true,
  relay: true,
  preflightFilter: true, // ← enables asset discovery check before quoting
});

// If Across doesn't support the pair, it won't even be queried
const { quotes } = await aggregator.quote(params);
```

### Scenario 8: Custom poll intervals

```typescript
const ref = await aggregator.submit(best, ctx);

// Fast polling for time-sensitive UIs
for await (const update of aggregator.track(ref, {
  pollIntervalMs: 3_000,   // check every 3s instead of default 12s
  maxDurationMs: 10 * 60_000, // give up after 10 min
})) {
  console.log(update.status);
}
```

### Scenario 9: Testnet configuration

```typescript
const aggregator = SwapIntentAggregator.create({
  across: { isTestnet: true },  // → https://testnet.across.to/api
  relay: { isTestnet: true },   // → https://api.testnets.relay.link
  oif: {
    solvers: [{
      solverId: "testnet-solver",
      url: "https://oif-api.openzeppelin.com/api",
    }],
  },
});
```

---

## Error handling

All SDK errors extend `SdkError` with structured types you can catch:

```typescript
import {
  QuoteFetchError,
  QuoteTimeoutError,
  PayloadValidationError,
  SettlerValidationError,
  SubmitError,
  TrackingRefInvalidError,
  IntentNotFoundError,
} from "@wonderland/interop-cross-chain-v2";

try {
  const action = aggregator.prepare(quote);
} catch (err) {
  if (err instanceof PayloadValidationError) {
    // Calldata doesn't match what the user agreed to — possible tampering
    console.error("Security: calldata mismatch", err.message);
  } else if (err instanceof SettlerValidationError) {
    // tx.to is not a known Across SpokePool — possible phishing
    console.error("Security: unknown settler", err.message);
  }
}
```

| Error class | When |
|---|---|
| `QuoteFetchError` | Protocol API returned an error |
| `QuoteTimeoutError` | Quote request exceeded `timeoutMs` |
| `PayloadValidationError` | Calldata or payload doesn't match the quote |
| `SettlerValidationError` | `tx.to` is not a known contract for the chain |
| `SubmitError` | Transaction submission failed |
| `TrackingRefInvalidError` | Tracking ref is malformed or missing data |
| `OriginTxRevertedError` | Origin chain transaction reverted |
| `OpenEventParseError` | Could not parse on-chain Open event |
| `IntentNotFoundError` | Quote/ref doesn't match any configured intent |

---

## Asset discovery

Query supported assets per protocol independently:

```typescript
import {
  AcrossAssetDiscovery,
  OIFAssetDiscovery,
} from "@wonderland/interop-cross-chain-v2";

const across = new AcrossAssetDiscovery();
const oif = new OIFAssetDiscovery({
  source: "oif:my-solver",
  baseUrl: "https://solver.example.com",
  solverId: "my-solver",
});

// All supported assets
const result = await across.getSupportedAssets();
// result.networks → [{ chainId: 1, assets: [...] }, { chainId: 10, assets: [...] }, ...]

// Check specific pair
const ok = await across.isAssetSupported(1, "0xA0b8...USDC");

// Cached — subsequent calls return instantly until TTL expires
const result2 = await across.getSupportedAssets();

// Force refresh
await across.getSupportedAssets({ forceRefresh: true });
```

---

## Types reference

### `SwapQuoteRequest`

```typescript
interface SwapQuoteRequest {
  user: Address;
  input: { chainId: number; token: Address; amount: bigint };
  output: { chainId: number; token: Address; minAmount?: bigint };
  swapType?: "exact-input" | "exact-output";
  recipient?: Address;
}
```

### `SwapQuote`

```typescript
interface SwapQuote {
  quoteId: string;
  protocol: string;            // "oif" | "across" | "relay"
  variant: string;             // "escrow" | "user-open" | "default"
  submission: "tx" | "sign";
  input: { chainId: number; token: Address; amount: bigint };
  output: { chainId: number; token: Address; amount: bigint };
  eta?: number;                // estimated fill time in seconds
  expiry?: number;             // quote expiration timestamp
  approvals?: ApprovalRequirement[];
  signPayload?: { domain, types, primaryType, message };
}
```

### `PreparedAction`

```typescript
// What the SDK tells the wallet to do
type PreparedAction =
  | { type: "tx"; to: Address; data: Hex; value?: bigint; chainId: number }
  | { type: "sign"; typedData: { domain, types, primaryType, message } };
```

### `ConfirmResult`

```typescript
// What the wallet tells the SDK it did
type ConfirmResult =
  | { type: "tx"; txHash: Hex }
  | { type: "sign"; signature: Hex };
```

### `TrackingRef`

```typescript
// Serializable — persist to localStorage, DB, etc.
type TrackingRef =
  | { type: "txHash"; protocol: string; hash: Hex; originChainId: number; destinationChainId: number; meta?: Record<string, unknown> }
  | { type: "orderId"; protocol: string; id: string; originChainId: number; destinationChainId: number; meta?: Record<string, unknown> };
```

### `SwapOrderUpdate`

```typescript
interface SwapOrderUpdate {
  status: "submitted" | "pending" | "filling" | "filled" | "settled" | "finalized" | "failed" | "expired" | "refunded";
  timestamp: number;
  message?: string;
  orderId?: string;
  fillTxHash?: Hex;
  failureReason?: string;
}
```

---

## Supported protocols

| Protocol | Submission type | Variants | Tracking method |
|----------|----------------|----------|-----------------|
| **OIF** (escrow) | EIP-712 signature | `escrow` | Solver API polling |
| **OIF** (user-open) | On-chain tx | `user-open` | Solver API + on-chain event parsing |
| **Across** | On-chain tx | `default` | Across API polling |
| **Relay** | On-chain tx | `default` | Relay API polling |

## Security validations

The SDK validates protocol responses before presenting them to the wallet:

- **Settler validation** (Across): verifies `tx.to` matches known SpokePool addresses per chain
- **Deep calldata validation** (Across): decodes the deposit calldata and checks every field (inputToken, outputToken, amount, recipient, destinationChain, depositor) matches the agreed quote
- **Payload consistency** (OIF Escrow): verifies the EIP-712 message amounts match the quote preview
- **Tx consistency** (Relay): verifies the prepared transaction destination matches the quote
- **Origin tx revert detection**: checks if the submitted transaction reverted before starting fill tracking

---

## License

MIT
